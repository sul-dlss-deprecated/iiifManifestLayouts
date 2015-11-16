'use strict';

var CanvasObject = function(config) {
  this.needed = config.needed || false;
  this.visible = config.visible || true;
  this.clipRegion = config.clipRegion;
  this.opacity = config.opacity || 1;
  this.position = config.position || {x: 0, y: 0};
  this.placeholder = config.placeholder || '/some-image.jpg';

  this.id = config.canvas['@id'];
  this.height = config.canvas.height;
  this.width = config.canvas.width;
  this.images = config.canvas.images;
  this.label = config.canvas.label;
  this.tileSourceUrl = config.canvas.images[0].resource.service['@id'] + '/info.json';
};

CanvasObject.prototype = {
   setMainImage: function(mainImage) {
    this.mainImageObj = mainImage;
    // this object also has things like opacity - should we make sure that corresponding values of this
    // match the attribtes of the CanvasObject? In the case of a conflict, which value wins?
   }
};

module.exports = CanvasObject;
