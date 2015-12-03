'use strict';

require('openseadragon');

var ImageResource = function(config, parent, dispatcher) {
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
  this.imageType = config.imageType || "main"; // can be 'main', 'alternate', or 'detail'
  this.status = 'initialized'; // can be 'requested', 'received', 'pending','shown', or 'failed'
  this.parent = parent;
  this.dispatcher = dispatcher;
};

ImageResource.prototype = {
  hide: function() {

  },

  // todo: take parent opacity into account here and in the constructor
  setOpacity: function(opacity) {
    this.opacity = opacity;
    if(this.tiledImage) {
      this.tiledImage.setOpacity(this.opacity);
    }
  },

  getOpacity: function() {
    return this.opacity;
  },

  openTileSource: function(viewer, parentHandler) {
    var self = this;

    // We've already loaded this tilesource
    if(this.status === 'shown') {
      return;
    }

    // otherwise, continue loading the tileSource.
    this.dispatcher.emit('image-resource-tile-source-requested', { 'detail': this.tileSource });
    self.status = 'requested';
    var position = this._getPositionInViewer();
    viewer.addTiledImage({
      x: position.x,
      y: position.y,
      width: this.parent.bounds.width * this.width,
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
            viewer.removeHandler('tile-drawn', tileDrawnHandler);
            self.dispatcher.emit('image-resource-tile-source-opened', { 'detail': self.tileSource });
            parentHandler(event);
          }
        };
        viewer.addHandler('tile-drawn', tileDrawnHandler);
      },

      error: function(event) {
        var errorInfo = {
          id: self.tileSource,
          message: event.message,
          source: event.source
        };
        self.status = 'failed';
        self.dispatcher.emit('image-resource-tile-source-failed', {'detail': errorInfo});
      }
    });
  },

  getImageType: function() {
    return this.imageType;
  },

  getBounds: function() {
    return new OpenSeadragon.Rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
  },

  _getPositionInViewer: function() {
    return new OpenSeadragon.Point(
        this.parent.bounds.x + (this.parent.bounds.width * this.x),
        this.parent.bounds.y + (this.parent.bounds.width * this.y));
  },

  updateForParentChange: function(immediately) {
    if(this.tiledImage) {
      var bounds = this._getBoundsInViewer();
      this.tiledImage.setPosition(bounds.getTopLeft(), immediately);
      this.tiledImage.setWidth(bounds.width, immediately);
    }
  },

  //Assumes that the point parameter is already in viewport coordinates.
  containsPoint: function(point) {
    var position = this._getPositionInViewer();

    var width = this.parent.bounds.width * this.width;
    var height = this.parent.bounds.height * this.height;

    var rectRight = position.x + width;
    var rectBottom = position.y + height;

    return (position.x <= point.x && rectRight >= point.x && position.y <= point.y && rectBottom >= point.y);
  },

  getStatus: function() {
    return this.status;
  }

  // todo: layering/z-index functions. Should this object know about
  // its sibling image objects? If so, how?
}

module.exports = ImageResource;
