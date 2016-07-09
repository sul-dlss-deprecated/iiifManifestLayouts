var ImageResource = require('./ImageResource');
var ImageResourceFactory = require('./ImageResourceFactory');
var ThumbnailFactory = require('./ThumbnailFactory');

var CanvasObject = function(config) {
  'use strict';
  var self = this;

  this.dispatcher = config.dispatcher;
  this.id = config.canvas['@id'];
  this.label = config.canvas.label;
  this.canvas = config.canvas;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.index = config.index;
  this.bounds = {
    x : config.x || 0,
    y : config.y || 0,
    height : config.canvas.height,
    width : config.canvas.width
  };
  this.viewingHint = config.canvas.viewingHint;
  this.images = [];

  if(config.canvas.images) {
    config.canvas.images.forEach(function(image) {
      var imageResources = ImageResourceFactory(image, self);
      if(imageResources) {
        self.images = self.images.concat(imageResources);
      }
    });
  }

  this.thumbnailResource = ThumbnailFactory(this.canvas, self);
};

CanvasObject.prototype = {
  //Assumes that the point parameter is already in viewport coordinates.
  containsPoint: function(point) {
    var rectRight = this.bounds.x + this.bounds.width;
    var rectBottom = this.bounds.y + this.bounds.height;

    return (this.bounds.x <= point.x && rectRight >= point.x && this.bounds.y <= point.y && rectBottom >= point.y);
  },

  getVisibleImages: function() {
    return this.images.filter(function(image) { return image.visible === true; });
  },

  getDetailImages: function() {
    return this.images.filter(function(image) { return image.imageType === "detail"; });
  },

  getAlternateImages: function() {
    return this.images.filter(function(image) { return image.imageType === "alternate"; });
  },

  getMainImage: function() {
    return this.images.filter(function(image) { return image.imageType === "main"; })[0];
  },

  getImageById: function(id) {
    return this.images.filter(function(image) { return image.id === id; })[0];
  },

  getThumbnailResource: function() {
    return this.thumbnailResource;
  },

  setBounds: function(x, y, width, height) {
    var self = this;
    this.bounds.x = x;
    this.bounds.y = y;
    this.bounds.width = width;
    this.bounds.height = height;

    self.dispatcher.emit('canvas-position-updated', self);
  },

  getBounds: function() {
    var self = this;
    return {
      x: this.bounds.x,
      y: this.bounds.y,
      width: this.bounds.width,
      height: this.bounds.height,
      getTopLeft: function() {
        return {
          x: self.bounds.x,
          y: self.bounds.y
        };
      }
    };
  },

  getAspectRatio: function() {
    return this.bounds.width / this.bounds.height;
  },

  getThumbnailNeeded: function() {
    return this.thumbnailNeeded;
  },

  setThumbnailNeeded: function(needed) {
    this.thumbnailNeeded = needed;
    if (needed) {
      this.thumbnailResource.setNeeded(true);
      this.dispatcher.emit('canvas-thumbnail-needed', this);
    }
  },

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
      this.dispatcher.emit('canvas-needed', this);
    }
  },

  getNeeded: function() {
    return this.needed;
  },

  getOpacity: function() {
    return this.opacity;
  },

  setOpacity: function(opacity) {
    this.opacity = opacity;
    this.images.forEach(function(image) {
      image.updateOpacity();
    });
  },

  _floatImagesToBottom: function() {
    var i = 0;
    for(i; i < this.images; i++) {
      this.images[i].zIndex = i;
      this.images[i].updateItemIndex();
    }
  },

  moveToIndex: function(image, index) {
    this._floatImagesToBottom();
    var oldIndex = this.images.indexOf(image);

    console.log("old index: " + oldIndex);
    console.log("index: " + index);
    if (index === oldIndex || oldIndex === -1 ) {
      // Index either is invalid or is the same
      // as the previous index, requiring no change.
        return;
    }
    if ( index >= this.images.length ) {
        throw new Error( "Index bigger than number of images." );
    }

    image.zIndex = index;
    this.images.splice( oldIndex, 1 );
    this.images.splice( index, 0, image );
    image.updateItemIndex();
  },

  moveToBottom: function(image) {
    this.moveToIndex(image, 0);
  },

  moveToTop: function(image) {
    this.moveToIndex(image, this.images.length - 1);
  },

  insertAboveIndex: function(image, index) {
    if(index !== 0) {
      this.moveToIndex(image, index - 1);
    }
  },

  insertBelowIndex: function(image, index) {
    if(index < this.images.length - 1) {
      this.moveToIndex(image, index + 1);
    }
  },

  insertAboveResource: function(image, resource) {
    this.insertAboveIndex(image, this.images.indexOf(resource));
  },

  insertBelowResource: function(image, resource) {
    this.insertBelowIndex(image, this.images.indexOf(resource));
  },

  moveUpOne: function(image) {
    this.insertAboveResource(image, image);
  },

  moveDownOne: function(image) {
    this.insertBelowResource(image, image);
  }
};

module.exports = CanvasObject;
