var ImageResource = function(config) {
  'use strict';

  this.id = config.id;
  this.label = config.label || "No Label";
  this.needed = config.needed || false;
  this.visible = config.visible || false;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.bounds = config.bounds || {x:0, y:0, width:1,height:1};
  this.zIndex = config.zIndex;
  this.tileSource = config.tileSource;
  this.thumbUrl = config.thumbUrl;
  this.dynamic = config.dynamic || false;
  this.imageType = config.imageType || "main"; // can be 'main', 'alternate', 'detail' or 'thumbnail'
  this.status = 'initialized'; // can be 'requested', 'pending','shown', or 'failed'
  this.parent = config.parent;
  this.dispatcher = config.parent.dispatcher;
};

ImageResource.prototype = {
  show: function(timeout) {
    if (!this.needed) {
      this.setNeeded(true);
    }
    this.visible = true;
    this.dispatcher.emit('image-show', this);
  },

  hide: function(timeout) {
    this.visible = false;
    this.dispatcher.emit('image-hide', this);
  },

  getVisible: function() {
    return this.visible;
  },

  setNeeded: function(needed) {
    this.needed = needed;
    if (needed) {
      this.dispatcher.emit('image-needed', this);
    }
  },

  getThumbnailNeeded: function() {
    return this.needed;
  },

  getFullNeeded: function() {
    return this.needed;
  },

  setOpacity: function(opacity) {
    this.opacity = opacity;
    if ( this.visible ) {
      this.dispatcher.emit('image-opacity-updated', this);
    }
  },

  getOpacity: function() {
    return this.opacity;
  },

  getImageType: function() {
    return this.imageType;
  },

  getLocalBounds: function() {
    // Eexpressed as 0-1 factor of parent.
    //
    // For example: { x: 0.2, y: 0.8, width: 0.34, height: 0.12 }
    // These are intended to be multiplied by the parent canvas
    // dimensions to obtain global coordinates.
    return this.bounds;
  },

  getGlobalBounds: function() {
    var self = this;
    return {
      x: this.parent.bounds.x + (this.parent.bounds.width * self.bounds.x),
      y: this.parent.bounds.y + (this.parent.bounds.width * self.bounds.y),
      width: this.parent.bounds.width * self.bounds.width,
      height: this.parent.bounds.height * self.bounds.height
    };
  },

  containsGlobalPoint: function(point) {
    var bounds = this.getGlobalBounds();

    var rectRight = bounds.x + bounds.width;
    var rectBottom = bounds.y + bounds.height;

    return (bounds.x <= point.x && rectRight >= point.x && bounds.y <= point.y && rectBottom >= point.y);
  },

  setStatus: function(status) {
    this.status = status;
    this.dispatcher.emit('image-status-updated', this);
  },

  getStatus: function() {
    return this.status;
  },

  remove: function() {
    this.dispatcher.emit('image-removed', this);
  },

  moveToIndex: function(index) {
    this.parent.moveToIndex(this, index);
  },

  moveToBottom: function() {
    this.parent.moveToBottom(this);
  },

  moveToTop: function(image) {
    this.parent.moveToTop(this);
  },

  insertAboveIndex: function(image, index) {
    this.parent.insertAboveIndex(this, index);
  },

  insertBelowIndex: function(image, index) {
    this.parent.insertBelowIndex(this, index);
  },

  insertAboveResource: function(image, resource) {
    this.parent.insertAboveResource(this, resource);
  },

  insertBelowResource: function(image, resource) {
    this.parent.insertBelowResource(this, resource);
  },

  moveUpOne: function(image) {
    this.parent.moveUpOne(this);
  },

  moveDownOne: function(image) {
    this.parent.moveDownOne(this);
  }

};

module.exports = ImageResource;
