'use strict';

var CanvasObject = function(config) {
  this.fullyOpened = config.fullyOpened || false;
  this.visible = config.visible || true;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.x = config.x || 0;
  this.y = config.y || 0;
  this.placeholder = config.placeholder || { type: 'image', url: './example-thumbnail.png' };

  this.id = config.canvas['@id'];
  this.height = config.canvas.height;
  this.width = config.canvas.width;
  this.images = config.canvas.images;
  this.label = config.canvas.label;
  this.tileSourceUrl = config.canvas.images[0].resource.service['@id'] + '/info.json';
};

CanvasObject.prototype = {
  openTileSource: function(viewer) {
    var self = this;

    // We've already loaded this tilesource instead of the thumbnail
    if(this.fullyOpened) {
      return;
    }

    // otherwise, continue loading the tileSource.
    viewer.addTiledImage({
      x: this.x,
      y: this.y,
      width: this.width,
      tileSource: this.tileSourceUrl,
      index: 0, // Add the new image below the stand-in.

      success: function(event) {
        var main = event.item;
        self.fullyOpened = true;

        var tileDrawnHandler = function(event) {
          if (event.tiledImage === main) {
            var previousImageObj = self.mainImageObj;

            viewer.removeHandler('tile-drawn', tileDrawnHandler);
            self._setMainImage(main);
            main.setOpacity(0, true);
            self.fade(main, 1);

            if(previousImageObj){
              viewer.world.removeItem(previousImageObj);
            }
          }
        };
        viewer.addHandler('tile-drawn', tileDrawnHandler);
      }
    });
  },

  openThumbnail: function(x, y, width, viewer) {
    var self = this;
    viewer.addTiledImage({
      x: x,
      y: y,
      width: width,
      tileSource: this.placeholder,
      success: function(event) {
        self._setMainImage(event.item);
      }
    })
  },

  //Assumes that the point parameter is already in viewport coordinates.
  containsPoint: function(point) {
    this._setBoundsInternal(); // make sure we're up to date
    var rectRight = this.x + this.width;
    var rectBottom = this.y + this.height;

    return (this.x <= point.x && rectRight >= point.x && this.y <= point.y && rectBottom >= point.y);
  },

  setPosition: function(x, y) {
    this.mainImageObj.setPosition(new OpenSeadragon.Point(x, y), true);
    this._setBoundsInternal();
  },

  setWidth: function(width) {
    this.mainImageObj.setWidth(width, true);
    this._setBoundsInternal();
  },

  getBounds: function() {
    this._setBoundsInternal();
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  },

  // Call this to make sure that the CanvasObject's information about the world is the same as the OSD image's.
  _setBoundsInternal: function() {
    if(this.mainImageObj) {
      var bounds = this.mainImageObj.getBounds();

      this.x = bounds.x;
      this.y = bounds.y;
      this.width = bounds.width;
      this.height = bounds.height;
    }
  },

  _setMainImage: function(mainImage) {
    this.mainImageObj = mainImage;
    this._setBoundsInternal();
    // this object also has things like opacity - should we make sure that corresponding values of this
    // match the attribtes of the CanvasObject? In the case of a conflict, which value wins?
  },

  fade: function(image, targetOpacity, callback) {
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
