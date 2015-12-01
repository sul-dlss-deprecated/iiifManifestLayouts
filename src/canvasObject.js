'use strict';

var ImageResource = require('./ImageResource');

var CanvasObject = function(config, dispatcher) {
  this.fullyOpened = config.fullyOpened || false;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.placeholder = config.placeholder || { type: 'image', url: './example-thumbnail.png' };
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
        url: image.resource.service['@id'] + '/info.json'
      },
      dispatcher
    );
  });
    this.label = config.canvas.label;
  this.viewingHint = config.canvas.viewingHint;

  this.dispatcher = dispatcher;
};

CanvasObject.prototype = {
  openTileSource: function(viewer) {
    var self = this;
    var onTileDrawn = function(event) {
      var main = event.tiledImage;
      var previousImageObj = self._mainImageObj;
      main.setOpacity(0, true);
      self._fade(main, 1);
      self._setMainImage(main);

      if(previousImageObj){
        viewer.world.removeItem(previousImageObj);
      }
      self.dispatcher.emit('detail-tile-source-opened', { 'detail': self.id });
    };
    this.images[0].openTileSource(viewer, this.bounds, onTileDrawn);
  },

  openThumbnail: function(viewer) {
    var self = this;
    viewer.addTiledImage({
      x: this.bounds.x,
      y: this.bounds.y,
      width: this.bounds.width,
      tileSource: this.placeholder,
      opacity: this.opacity,
      clip: this.clipRegion,
      success: function(event) {
        self._setMainImage(event.item);
      }
    })
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

  setPosition: function(x, y) {
    var self = this;
    this.bounds.x = x;
    this.bounds.y = y;

    this.getVisibleImages().map(function(image) {
      image.setPosition(self.bounds, true);
    });
  },

  setSize: function(width, height) {
    var self = this;
    this.bounds.width = width;
    this.bounds.height = height;

    this.getVisibleImages().map(function(image) {
      image.setSize(self.bounds.width, true);
    });
  },

  // Returns an OpenSeadragon Rect object - some OpenSeadragon consumers of this function want one,
  // and others can get x, y, width and height out easily.
  getBounds: function() {
    return new OpenSeadragon.Rect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
  },

  hasImageObject: function() {
    return !!(this._mainImageObj);
  },

  _setMainImage: function(mainImage) {
    this._mainImageObj = mainImage;
    this._mainImageObj.setPosition(new OpenSeadragon.Point(this.bounds.x, this.bounds.y), true);
    this._mainImageObj.setWidth(this.bounds.width, true);
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
