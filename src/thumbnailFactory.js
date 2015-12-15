'use strict';

var ImageResource = require('./ImageResource');

var _getThumbUrl = function(image, width) {
  if(image.resource.service) {
    return image.resource.service['@id'] + '/full/' + Math.ceil(width / 4) + ',/0/default.jpg';
  } else {
    return image.resource['@id'];
  }
};

var ThumbnailFactory = function(canvas, parent) {
  // It may be the case that we have no images and no thumbnail in our canvas.
  if(canvas.thumbnail || !!canvas.images) {
    var config = {
      tileSource: {
        type: 'image',
        url: canvas.thumbnail || _getThumbUrl(canvas.images[0], canvas.width),
        buildPyramid: 'false'
      },
      parent: parent,
      imageType: 'thumbnail',
      dynammic: false
    };
    return new ImageResource(config);
  }
};

module.exports = ThumbnailFactory;
