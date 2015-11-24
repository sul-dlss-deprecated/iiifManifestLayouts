'use strict';

var CanvasObject = function(config, dispatcher) {
  this.fullyOpened = config.fullyOpened || false;
  this.visible = config.visible || true; // todo: this is not used yet. Do we need it?
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.x = config.x || 0;
  this.y = config.y || 0;
  this.placeholder = config.placeholder || { type: 'image', url: './example-thumbnail.png' };
  this.index = config.index;

  this.id = config.canvas['@id'];
  this.height = config.canvas.height;
  this.width = config.canvas.width;
  this.images = config.canvas.images;
  this.label = config.canvas.label;
  this.tileSourceUrl = config.canvas.images[0].resource.service['@id'] + '/info.json';
  this.viewingHint = config.canvas.viewingHint;

  this.dispatcher = dispatcher;
};

CanvasObject.prototype = {
  openTileSource: function(viewer) {
    var self = this;

    // We've already loaded this tilesource instead of the thumbnail
    if(this.fullyOpened) {
      return;
    }

    // otherwise, continue loading the tileSource.
    this.dispatcher.emit('detail-tile-source-requested', { 'detail': this.id });
    viewer.addTiledImage({
      x: this.x,
      y: this.y,
      width: this.width,
      tileSource: this.tileSourceUrl,
      opacity: this.opacity,
      clip: this.clipRegion,
      index: 0, // Add the new image below the stand-in.

      success: function(event) {
        var main = event.item;
        self.fullyOpened = true;

        var tileDrawnHandler = function(event) {
          if (event.tiledImage === main) {
            var previousImageObj = self._mainImageObj;

            viewer.removeHandler('tile-drawn', tileDrawnHandler);
            self._setMainImage(main);
            main.setOpacity(0, true);
            self._fade(main, 1);

            if(previousImageObj){
              viewer.world.removeItem(previousImageObj);
            }
            self.dispatcher.emit('detail-tile-source-opened', { 'detail': self.id });
          }
        };
        viewer.addHandler('tile-drawn', tileDrawnHandler);
      }
    });
  },

  openThumbnail: function(viewer) {
    var self = this;
    viewer.addTiledImage({
      x: this.x,
      y: this.y,
      width: this.width,
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
    var rectRight = this.x + this.width;
    var rectBottom = this.y + this.height;

    return (this.x <= point.x && rectRight >= point.x && this.y <= point.y && rectBottom >= point.y);
  },

  setPosition: function(x, y) {
    this.x = x;
    this.y = y;

    if(this.hasImageObject()) {
      this._mainImageObj.setPosition(new OpenSeadragon.Point(x, y), true);
    }
  },

  setSize: function(width, height) {
    this.width = width;
    this.height = height;

    if(this.hasImageObject()) {
      this._mainImageObj.setWidth(width, true);
    }
  },

  // Returns an OpenSeadragon Rect object - some OpenSeadragon consumers of this function want one,
  // and others can get x, y, width and height out easily.
  getBounds: function() {
    return new OpenSeadragon.Rect(this.x, this.y, this.width, this.height);
  },

  hasImageObject: function() {
    return !!(this._mainImageObj);
  },

  _setMainImage: function(mainImage) {
    this._mainImageObj = mainImage;
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
