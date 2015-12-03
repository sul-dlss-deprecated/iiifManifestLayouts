'use strict';

require('openseadragon');
var ImageResource = require('./ImageResource');

var CanvasObject = function(config, dispatcher) {
  var self = this;
  this.fullyOpened = config.fullyOpened || false;
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

  this.thumbnail = new ImageResource(
  {
    tileSource: config.canvas.thumbnail || this.images[0].tileSource
  },
  self,
  dispatcher
  );

  this.label = config.canvas.label;
  this.viewingHint = config.canvas.viewingHint;

  this.dispatcher = dispatcher;
};

CanvasObject.prototype = {
  openTileSource: function(viewer) {
    var self = this;
    var onTileDrawn = function(event) {
      var main = event.tiledImage;
      main.setOpacity(0, true);
      self._fade(main, 1);

      if(self.thumbnailImage){
        viewer.world.removeItem(self.thumbnailImage);
        self.thumbnailImage = null;
      }
      self.fullyOpened = true;
      self.dispatcher.emit('detail-tile-source-opened', { 'detail': self.id });
    };
    this.images[0].openTileSource(viewer, onTileDrawn);
  },

  openThumbnail: function(viewer) {
    var self = this;
    var onTileDrawn = function(event) {
      self.thumbnailImage = event.tiledImage;
      self.dispatcher.emit('detail-thumbnail-opened', { 'detail': self.id });
    }
    this.thumbnail.openTileSource(viewer, onTileDrawn);
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

  setPosition: function(x, y) {
    var self = this;
    this.bounds.x = x;
    this.bounds.y = y;

    if(this.fullyOpened) {
      this.images.forEach(function(image) {
        image.updateForParentChange(true);
      });
    }
    if(this.thumbnailImage) {
      this.thumbnail.updateForParentChange(true);
    }
  },

  setSize: function(width, height) {
    var self = this;
    this.bounds.width = width;
    this.bounds.height = height;

    if(this.fullyOpened) {
      this.images.forEach(function(image) {
        image.updateForParentChange(true);
      });
    }
    if(this.thumbnailImage) {
      this.thumbnail.updateForParentChange(true);
    }
  },

  // Returns an OpenSeadragon Rect object - some OpenSeadragon consumers of this function want one,
  // and others can get x, y, width and height out easily.
  getBounds: function() {
    return new OpenSeadragon.Rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
  },

  getAspectRatio: function() {
    return this.bounds.width / this.bounds.height;
  },

  _fade: function(image, targetOpacity, callback) {
    var currentOpacity = image.getOpacity();
    var step = (targetOpacity - currentOpacity) / 30;
    if (step === 0) {
      callback();
      return;
    }

    var frame = function() {
      currentOpacity += step;
      if ((step > 0 && currentOpacity >= targetOpacity) || (step < 0 && currentOpacity <= targetOpacity)) {
        image.setOpacity(targetOpacity);
        if (callback) callback();
        return;
      }

      image.setOpacity(currentOpacity);
      OpenSeadragon.requestAnimationFrame(frame);
    };
    OpenSeadragon.requestAnimationFrame(frame);
  }
};

module.exports = CanvasObject;
