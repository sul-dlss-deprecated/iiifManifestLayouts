'use strict';

var ImageResource = function(config, dispatcher) {
  this.needed = config.needed || false;
  this.visible = config.visible || false;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.x = config.x || 0;
  this.y = config.y || 0;
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

  openTileSource: function() {

  },

  getImageType: function() {

  },

  getBounds: function() {

  },

  setPosition: function() {

  },

  setSize: function() {

  },

  containsPoint: function() {

  },

  getStatus: function() {

  }

  // todo: layering/z-index functions. Should this object know about
  // its sibling image objects? If so, how?
}

module.exports = ImageResource;
