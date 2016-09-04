
require('openseadragon');
var ImageResource = require('./ImageResource');
var ImageResourceFactory = require('./ImageResourceFactory');
var ThumbnailFactory = require('./ThumbnailFactory');

var CanvasObject = function(config) {
  'use strict';
  var self = this;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.index = config.index;

  this.id = config.canvas['@id'];

  this.bounds = {
    x : config.x || 0,
    y : config.y || 0,
    height : config.canvas.height,
    width : config.canvas.width
  };

  this.label = config.canvas.label;
  this.viewingHint = config.canvas.viewingHint;

  this.dispatcher = config.dispatcher;
  this.viewer = config.viewer;
  this.canvas = config.canvas;
  this.images = [];

  if(config.canvas.images) {
    config.canvas.images.forEach(function(image) {
      var imageResources = ImageResourceFactory(image, self);
      if(imageResources) {
        self.images = self.images.concat(imageResources);
      }
    });
  }
  this._floatImagesToBottom();
};

CanvasObject.prototype = {
  removeThumbnail: function() {
    if(this.thumbnail){
      this.thumbnail.fade(0);
      this.thumbnail.removeFromCanvas();
      this.thumbnail.destroy();
      delete this.thumbnail;
    }
  },

  openMainTileSource: function(imageIndex) {
    if(this.images.length === 0) {
      return; // there are no images to open
    }

    this.dispatcher.emit('detail-tile-source-opened', { 'detail': this.id });

    var image = this.getMainImage();
    var self = this;

    var onTileDrawn = function(event) {
      if(event.detail.tileSource === image.tileSource) {
        self.dispatcher.removeListener('image-resource-tile-source-opened', onTileDrawn);
        self.removeThumbnail();
      }
    };
    this.dispatcher.on('image-resource-tile-source-opened', onTileDrawn);
    var thumbnailStatus = (this.thumbnail ? this.thumbnail.getStatus() : '');
    image.openTileSource({
      waitForFirstTile: thumbnailStatus === 'shown'
    });
  },

  openThumbnail: function() {
    var self = this;
    this.thumbnail = ThumbnailFactory(this.canvas, self);
    if(this.thumbnail) {
      this.thumbnail.openTileSource();
      this.images.push(this.thumbnail);
      this.dispatcher.emit('detail-thumbnail-opened', { 'detail': this.id });
    } else { // sometimes there isn't a thumbnail
      this.openMainTileSource();
    }
  },

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

  setBounds: function(x, y, width, height) {
    var self = this;
    this.bounds.x = x;
    this.bounds.y = y;
    this.bounds.width = width;
    this.bounds.height = height;

    this.images.forEach(function(image) {
      image.updateForParentChange(true);
    });
  },

  // Returns an OpenSeadragon Rect object - some OpenSeadragon consumers of this function want one,
  // and others can get x, y, width and height out easily.
  getBounds: function() {
    return new OpenSeadragon.Rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
  },

  getAspectRatio: function() {
    return this.bounds.width / this.bounds.height;
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
