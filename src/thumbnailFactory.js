'use strict';

var ImageResource = require('./ImageResource');
var imageFormatError = "Unsupported image format for LegacyTileSource.";

var _getResourceFormat = function(mimeType) {
  switch(mimeType) {
    case('image/jpeg'):
      return 'jpg';
      break;
    case('image/png'):
      return 'png';
      break;
    case('image/gif'):
      return 'gif';
      break;
    default:
      throw(imageFormatError)
      break;
  }
};

var _getThumbUrl = function(resource) {

  var _buildResourceSize = function() {
    return "/full/" + Math.ceil(resource.width / 4) + ",/";
  }

  var id = resource['@id'];
  if(!id.toLowerCase().match(/^.*\.(png|jpg|jpeg|gif)$/)) { // it is still a service URL
    var format = _getResourceFormat(resource.format);
    return resource.service['@id'] + _buildResourceSize() + '0/default.' + format;
  }
  else { // we still don't want the full size
    return id.replace("/full/full/", _buildResourceSize());
  }
};

var _getThumbLevel = function(resource) {
  if(resource.default) {
    return _getThumbLevel(resource.default);
  }

  return {
    url: _getThumbUrl(resource),
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
    dynamic: false,
    zIndex: 9999
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
    try {
      var config = _makeThumbnailConfig(canvas.images[0].resource, parent);
      return new ImageResource(config);
    } catch (error){
      // If we can't use LegacyTileSource to build the thumbnail, don't build a thumbnail.
      if(error == imageFormatError) {
        return;
      } else {
        throw (error);
      }
    }
  }
};

module.exports = ThumbnailFactory;
