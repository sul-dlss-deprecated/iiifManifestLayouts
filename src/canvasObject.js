'use strict';

require('openseadragon');
var ImageResource = require('./ImageResource');

var CanvasObject = function(config, dispatcher) {
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
  this.thumbUrl = config.canvas.thumbnail;
  this.thumbService = config.canvas.images[0].resource.service['@id'];

  // details and alternates possibly go here; disambiguate between them.
  this.images = config.canvas.images.map(function(image) {
    return new ImageResource(
      {
        tileSource: image.resource.service['@id'] + '/info.json'
      },
      self,
      dispatcher
    );
  });

  this.label = config.canvas.label;
  this.viewingHint = config.canvas.viewingHint;

  this.dispatcher = dispatcher;
};

CanvasObject.prototype = {
  openTileSource: function(viewer, imageIndex) {
    this.dispatcher.emit('detail-tile-source-opened', { 'detail': this.id });
    var thumbnail = this.thumbnail;
    var image = this.images[imageIndex];

    var onTileDrawn = function(event) {
      if(event.detail === image.tileSource) {
        image.hide(true);
        image.fade(1);

        if(thumbnail){
          thumbnail.destroy(viewer);
        }
      }
    };

    this.dispatcher.once('image-resource-tile-source-opened', onTileDrawn);
    image.openTileSource(viewer);
  },

  openMainTileSource: function(viewer) {
    this.openTileSource(viewer, 0);
  },

  openThumbnail: function(viewer) {
    this.dispatcher.emit('detail-thumbnail-opened', { 'detail': this.id });
    var self = this;

    this.thumbnail = new ImageResource(
      {
        tileSource: {
          type: 'image',
          url: this.thumbUrl || this.thumbService + '/full/' + Math.ceil(this.bounds.width * 2) + ',/0/default.jpg'
        }
      },
      self,
      this.dispatcher
    );

    this.thumbnail.openTileSource(viewer);
    this.images.push(this.thumbnail);
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
    return this.images.filter(function(image) { return image.imageType === "detail" });
  },

  getAlternateImages: function() {
    return this.images.filter(function(image) { return image.imageType === "alternate" });
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

};

module.exports = CanvasObject;
