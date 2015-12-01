'use strict';

var ImageResource = function(config, dispatcher) {
  this.needed = config.needed || false;
  this.visible = config.visible || false;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.x = config.x || 0;
  this.y = config.y || 0;
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

  setOpacity: function() {

  },

  getOpacity: function() {

  },

  buildTileSource: function() {

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
    viewer.addTiledImage({
      x: parentBounds.x + (parentBounds.width * this.x),
      y: parentBounds.y + (parentBounds.width * this.y),
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

  },

  getBounds: function() {

  },

  setPosition: function(parentBounds, immediately) {
    var position = new OpenSeadragon.Point(
        parentBounds.x + (parentBounds.width * this.x),
        parentBounds.y + (parentBounds.width * this.y));

    this.tiledImage.setPosition(position, immediately);
  },

  setSize: function(parentWidth, immediately) {
    this.tiledImage.setWidth(parentWidth * this.width, immediately);
  },

  containsPoint: function() {

  },

  getStatus: function() {

  }

  // todo: layering/z-index functions. Should this object know about
  // its sibling image objects? If so, how?
}

module.exports = ImageResource;
