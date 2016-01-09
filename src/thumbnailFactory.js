'use strict';

var ImageResource = require('./ImageResource');

var _getThumbUrl = function(resource, width) {
  if(resource.default) {
    return resource.default.id;
  } else {
    return resource['@id'];
  }
};

var _getThumbLevel = function(resource) {
  if(resource.default) {
    return _getThumbLevel(resource.default);
  }

  return {
    url: resource['@id'],
    height: resource.height,
    width: resource.width,
  }
};

var _makeThumbnailConfig = function(resource, parent) {
  return {
    tileSource: {
      type: 'legacy-image-pyramid',
      levels: [
        _getThumbLevel(resource),
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
  if(canvas.images) {
    var config = _makeThumbnailConfig(canvas.images[0].resource, parent);
    return new ImageResource(config);
  }
};

module.exports = ThumbnailFactory;
