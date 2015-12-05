'use strict';

require('openseadragon');

var ImageResource = function(config) {
  this.needed = config.needed || false;
  this.visible = config.visible || false;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.x = config.x || 0;
  this.y = config.y || 0;
  this.height = config.height || 1;
  this.width = config.width || 1;
  this.zIndex = config.zIndex || 0;
  this.tileSource = config.tileSource;
  this.dynamic = config.dynamic || false;
  this.imageType = config.imageType || "main"; // can be 'main', 'alternate', 'detail' or 'thumbnail'
  this.status = 'initialized'; // can be 'requested', 'received', 'pending','shown', or 'failed'
  this.parent = config.parent;
  this.dispatcher = this.parent.dispatcher;
};

ImageResource.prototype = {
  hide: function() {
    this.previousOpacity = this.opacity;
    this.visible = false;
    this.updateOpacity(0);
  },

  show: function() {
    this.visible = true;
    this.updateOpacity(this.opacity);
  },

  updateOpacity: function(opacity) {
    if(this.tiledImage) {
      this.tiledImage.setOpacity(opacity * this.parent.getOpacity());
    }
  },

  setOpacity: function(opacity) {
    this.opacity = opacity;
    if(this.visible) {
      this.updateOpacity(this.opacity);
    }
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
    var bounds = this._getBoundsInViewer();
    this.parent.viewer.addTiledImage({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      tileSource: this.tileSource,
      opacity: this.parent.opacity * this.opacity,
      clip: this.clipRegion,
      index: this.zIndex,

      success: function(event) {
        var main = event.item;
        self.status = 'pending';

        var tileDrawnHandler = function(event) {
          if (event.tiledImage === main) {
            self.tiledImage = main;
            self.updateForParentChange();
            self.visible = true;
            self.status = 'shown';
            self.parent.viewer.removeHandler('tile-drawn', tileDrawnHandler);
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

  _getBoundsInViewer: function() {
    return new OpenSeadragon.Rect(
        this.parent.bounds.x + (this.parent.bounds.width * this.x),
        this.parent.bounds.y + (this.parent.bounds.width * this.y),
        this.parent.bounds.width * this.width,
        this.parent.bounds.height * this.height
    );
  },

  updateForParentChange: function(immediately) {
    if(this.tiledImage) {
      var bounds = this._getBoundsInViewer();
      this.tiledImage.setPosition(bounds.getTopLeft(), immediately);
      this.tiledImage.setWidth(bounds.width, immediately);
    }
  },

  //Assumes that the point parameter is already in viewport coordinates.
  containsViewerPoint: function(point) {
    var bounds = this._getBoundsInViewer();

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
      this.parent.viewer.world.removeItem(this.tiledImage);
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
  }

  // todo: layering/z-index functions. Should this object know about
  // its sibling image objects? If so, how?
}

module.exports = ImageResource;
