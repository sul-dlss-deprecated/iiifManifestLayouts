'use strict';

var ImageResource = require('./ImageResource');

var _getThumbUrl = function(resource, width) {
  if(resource.service) {
    return resource.service['@id'] + '/full/' + Math.ceil(width) + ',/0/default.jpg';
  } else if(resource.default) {
    return _getThumbUrl(resource.default, width);
  } else {
    return resource['@id'];
  }
};

var _getThumbLevel = function(canvas, divisor) {
  return {
    url: _getThumbUrl(canvas.images[0].resource, canvas.width / divisor),
    height: canvas.height / divisor,
    width: canvas.width / divisor,
  }
};

var _makeThumbnailConfig = function(canvas, parent) {
  return {
    tileSource: {
      type: 'legacy-image-pyramid',
      levels: [
        _getThumbLevel(canvas, 4),
        _getThumbLevel(canvas, 8),
        _getThumbLevel(canvas, 16)
      ]
    },
    parent: parent,
    imageType: 'thumbnail',
    dynammic: false
  };
};

var ThumbnailFactory = function(canvas, parent) {
  // The canvas has a thumbnail object.
  if(canvas.thumbnail) {
    return new ImageResource(_makeThumbnailConfig(canvas.thumbnail, parent));
  }

  // If the canvas has no thumbnail object, we try to fall back to using an image from it.
  // If the canvas has no images and no thumbnail, we can't do anything, so we don't bother.
  // If there is no thumbnail and only one image in this canvas, there's no reason to make a thumbnail for it-
  // the canvasobject will fall back to opening the main tilesource in the absence of a thumbnail.
  if(canvas.images && canvas.images.length > 1) {
    var config = _makeThumbnailConfig(canvas, parent);
    return new ImageResource(config);
  }

  if(canvas.images.length == 1) {
    console.log("Only one image");
  }
};

module.exports = ThumbnailFactory;
