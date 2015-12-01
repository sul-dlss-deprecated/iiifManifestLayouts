'use strict';

var ImageResource = function(config, dispatcher) {
  this.needed = config.needed || false;
  this.visible = config.visible || false;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.x = config.x || 0;
  this.y = config.y || 0;
  this.height = config.height || 1;
  this.width = config.width || 1;
  this.zIndex = config.zIndex || 0;
  this.url = config.url;
  this.dynamic = config.dynamic || false;
  this.imageType = config.imageType || "main"; // can be 'main', 'alternate', or 'detail'

  this.status = 'initialized'; // can be 'requested', 'received', 'pending' or 'shown'
  this.dispatcher = dispatcher;
};

ImageResource.prototype = {
  hide: function() {

  },

  setOpacity: function(opacity) {
    this.opacity = opacity;
    this.tiledImage.setOpacity(opacity);
  },

  getOpacity: function() {
    return this.opacity;
  },

  openTileSource: function(viewer, parentBounds, parentHandler) {
    var self = this;

    // We've already loaded this tilesource instead of the thumbnail
    if(this.fullyOpened) {
      return;
    }

    // otherwise, continue loading the tileSource.
    this.dispatcher.emit('image-resource-tile-source-requested', { 'detail': this.url });
    self.status = 'requested';
    var position = this._getPositionInViewer(parentBounds);
    viewer.addTiledImage({
      x: position.x,
      y: position.y,
      width: parentBounds.width * this.width,
      tileSource: this.url,
      opacity: this.opacity,
      clip: this.clipRegion,
      index: this.zIndex,

      success: function(event) {
        var main = event.item;
        self.status = 'pending';

        var tileDrawnHandler = function(event) {
          if (event.tiledImage === main) {
            self.tiledImage = main;
            self.fullyOpened = true;
            self.visible = true;
            self.status = 'shown';
            viewer.removeHandler('tile-drawn', tileDrawnHandler);
            self.dispatcher.emit('image-resource-tile-source-opened', { 'detail': self.url });
            parentHandler(event);
          }
        };
        viewer.addHandler('tile-drawn', tileDrawnHandler);
      },

      error: function(event) {
        var errorInfo = {
          id: self.url,
          message: event.message,
          source: event.source
        };
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

  _getPositionInViewer: function(parentBounds) {
    return new OpenSeadragon.Point(
        parentBounds.x + (parentBounds.width * this.x),
        parentBounds.y + (parentBounds.width * this.y));
  },

  setPosition: function(parentBounds, immediately) {
    var position = this._getPositionInViewer(parentBounds);
    this.tiledImage.setPosition(position, immediately);
  },

  setSize: function(parentWidth, immediately) {
    this.tiledImage.setWidth(parentWidth * this.width, immediately);
  },

  //Assumes that the point parameter is already in viewport coordinates.
  containsPoint: function(point, parentBounds) {
    var position = this._getPositionInViewer(parentBounds);

    var width = parentBounds.width * this.width;
    var height = parentBounds.height * this.height;

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
