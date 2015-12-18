'use strict';

require('openseadragon');

var ImageResource = function(config) {
  this.label = config.label || "No Label";
  this.needed = config.needed || false;
  this.visible = config.visible || false;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.bounds = config.bounds || new OpenSeadragon.Rect(0, 0, 1, 1);
  this.zIndex = config.zIndex || 0;
  this.tileSource = config.tileSource;
  this.dynamic = config.dynamic || false;
  this.imageType = config.imageType || "main"; // can be 'main', 'alternate', 'detail' or 'thumbnail'
  this.status = 'initialized'; // can be 'requested', 'received', 'pending','shown', or 'failed'
  this.parent = config.parent;
  this.dispatcher = config.parent.dispatcher;
  this.viewer = config.parent.viewer;
};

ImageResource.prototype = {
  hide: function() {
    this.visible = false;
    this.updateOpacity();
  },

  show: function() {
    this.visible = true;
    this.updateOpacity();
  },

  updateOpacity: function() {
    if(this.tiledImage) {
      if(this.visible) {
        this.tiledImage.setOpacity(this.opacity * this.parent.getOpacity());
      } else {
        this.tiledImage.setOpacity(0);
      }
    }
  },

  setOpacity: function(opacity) {
    this.opacity = opacity;
    this.updateOpacity();
  },

  getOpacity: function() {
    return this.opacity;
  },

  openTileSource: function() {
    var self = this;

    // We've already loaded this tilesource
    if(this.status === 'shown') {
      return;
    }

    // otherwise, continue loading the tileSource.
    this.dispatcher.emit('image-resource-tile-source-requested', { 'detail': self });
    this.status = 'requested';
    var bounds = this._getBoundsInViewer(this.bounds);
    var clip = this._getBoundsInViewer(this.clipRegion);
    console.log("config zindex:", this.zIndex);
    this.viewer.addTiledImage({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      tileSource: this.tileSource,
      opacity: this.opacity,
      clip: clip,
      index: this.zIndex,

      success: function(event) {
        var main = event.item;
        self.status = 'pending';

        var tileDrawnHandler = function(event) {
          if (event.tiledImage === main) {
            self.tiledImage = main;
            self.updateForParentChange();
            self.updateOpacity();
            self.show();
            self.status = 'shown';
            // debug helpers
            console.log(self.label, "bounds:",self.tiledImage.getBounds());
            console.log(self.label, "clip:",self.tiledImage.getClip());
            console.log(self.label, "zindex:", self.viewer.world.getIndexOfItem(self.tiledImage));
            // end debug helpers

            self.viewer.removeHandler('tile-drawn', tileDrawnHandler);
            self.dispatcher.emit('image-resource-tile-source-opened', { 'detail': self });
          }
        };
        self.parent.viewer.addHandler('tile-drawn', tileDrawnHandler);
      },

      error: function(event) {
        var errorInfo = {
          id: self.tileSource,
          message: event.message,
          source: event.source
        };
        self.status = 'failed';
        self.parent.dispatcher.emit('image-resource-tile-source-failed', {'detail': errorInfo});
      }
    });
  },

  getImageType: function() {
    return this.imageType;
  },

  getBounds: function() {
    return new OpenSeadragon.Rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
  },

  _getBoundsInViewer: function(rect) {
    if(rect) {
      return new OpenSeadragon.Rect(
          this.parent.bounds.x + (this.parent.bounds.width * rect.x),
          this.parent.bounds.y + (this.parent.bounds.width * rect.y),
          this.parent.bounds.width * rect.width,
          this.parent.bounds.height * rect.height
      );
    }
  },

  updateForParentChange: function(immediately) {
    if(this.tiledImage) {
      var bounds = this._getBoundsInViewer(this.bounds);
      this.tiledImage.setPosition(bounds.getTopLeft(), immediately);
      this.tiledImage.setWidth(bounds.width, immediately);
    }
  },

  //Assumes that the point parameter is already in viewport coordinates.
  containsViewerPoint: function(point) {
    var bounds = this._getBoundsInViewer(this.bounds);

    var width = this.parent.bounds.width * this.width;
    var height = this.parent.bounds.height * this.height;

    var rectRight = bounds.x + bounds.width;
    var rectBottom = bounds.y + bounds.height;

    return (bounds.x <= point.x && rectRight >= point.x && bounds.y <= point.y && rectBottom >= point.y);
  },

  getStatus: function() {
    return this.status;
  },

  destroy: function() {
    if(this.tiledImage) {
      this.viewer.world.removeItem(this.tiledImage);
      this.tiledImage = null;
    }
  },

   fade: function(targetOpacity, callback) {
    var self = this;
    var currentOpacity = this.opacity;
    var step = (targetOpacity - currentOpacity) / 30;
    if (step === 0) {
      if (callback) callback();
      return;
    }

    var frame = function() {
      currentOpacity += step;
      if ((step > 0 && currentOpacity >= targetOpacity) || (step < 0 && currentOpacity <= targetOpacity)) {
        self.setOpacity(targetOpacity);
        if (callback) callback();
        return;
      }

      self.setOpacity(currentOpacity);
      OpenSeadragon.requestAnimationFrame(frame);
    };
    OpenSeadragon.requestAnimationFrame(frame);
  },

  updateItemIndex: function() {
    if(this.tiledImage && this.parent.images.length > 0) {
      this.viewer.world.setItemIndex(this.tiledImage, this.zIndex);
      console.log("new index",this.viewer.world.getIndexOfItem(this.tiledImage));
    }
  },

  removeFromCanvas: function() {
    var previous = this.parent.images.indexOf(this);
    this.parent.images.splice(previous, 1);
  },

  moveToTop: function() {
    this.zIndex = 0;
    this.removeFromCanvas();
    this.parent.images.unshift(this);
    this.updateItemIndex();
  },

  moveToBottom: function() {
    this.zIndex = this.parent.images.length - 1;
    this.removeFromCanvas();
    this.parent.images.push(this);
    this.updateItemIndex();
  }
}

module.exports = ImageResource;
