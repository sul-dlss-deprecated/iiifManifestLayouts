'use strict';

var CanvasAnimationHelpers = require('./CanvasAnimationHelpers');

var CanvasObject = function(config) {
  this.needed = config.needed || false;
  this.visible = config.visible || true;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.position = config.position || { x: 0, y: 0 };
  this.placeholder = config.placeholder || { type: 'image', url: './example-thumbnail.png' };

  this.id = config.canvas['@id'];
  this.height = config.canvas.height;
  this.width = config.canvas.width;
  this.images = config.canvas.images;
  this.label = config.canvas.label;
  this.tileSourceUrl = config.canvas.images[0].resource.service['@id'] + '/info.json';
};

CanvasObject.prototype = {
  openTileSource: function(x, y, width, viewer) {
    var self = this;

    viewer.addTiledImage({
      x: x,
      y: y,
      width: width,
      tileSource: this.tileSourceUrl,
      index: 0, // Add the new image below the stand-in.
      success: function(event) {
        var main = event.item;

        var tileDrawnHandler = function(event) {
          if (event.tiledImage === main) {
            var previousImageObj = self.mainImageObj;

            viewer.removeHandler('tile-drawn', tileDrawnHandler);
            self._setMainImage(main);
            main.setOpacity(0, true);
            CanvasAnimationHelpers.fade(main, 1);

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
    var rect = this.mainImageObj.getBounds();
    var rectRight = rect.x + rect.width;
    var rectBottom = rect.y + rect.height;

    return (rect.x <= point.x && rectRight >= point.x && rect.y <= point.y && rectBottom >= point.y);
  },

  _setMainImage: function(mainImage) {
    this.mainImageObj = mainImage;
    // this object also has things like opacity - should we make sure that corresponding values of this
    // match the attribtes of the CanvasObject? In the case of a conflict, which value wins?
  },
};

module.exports = CanvasObject;
