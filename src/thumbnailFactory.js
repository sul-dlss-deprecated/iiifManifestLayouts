'use strict';

var ImageResource = require('./ImageResource');
var imageFormatError = "Unsupported image format for LegacyTileSource.";

var getResourceFormat = function(mimeType) {
  switch(mimeType) {
  case('image/jpeg'):
    return 'jpg';
  case('image/jpg'):
    return 'jpg';
  case('image/png'):
    return 'png';
  case('image/gif'):
    return 'gif';
  default:
    throw(imageFormatError);
  }
};

var getThumbUrl = function(resource, width) {

  var serviceVersion;
  if (resource['@context'] == "http://iiif.io/api/image/2/context.json") {
    serviceVersion = "2.0";
  } else {
    serviceVersion = "1.1";
  }

  var buildResourceSize = function() {
    return "/full/" + width + ",/";
  };

  var getTileBasename = function() {
    if (serviceVersion === '2.0') return 'default';
    return 'native';
  };

  var id = resource['@id'];
  if(!id.toLowerCase().match(/^.*\.(png|jpg|jpeg|gif)$/)) { // it is still a service URL
    var format = getResourceFormat(resource.format);
    return resource.service['@id'] + buildResourceSize() + '0/' + getTileBasename() + '.' + format;
  }
  else { // we still don't want the full size
    return id.replace("/full/full/", buildResourceSize());
  }
};

var getThumbLevel = function(resource, width, height) {
  var widthParam = 200,
      scaleFactor = widthParam/width,
      scaledWidth = width*scaleFactor,
      scaledHeight = height*scaleFactor;

  if(resource.default) {
    // resources with a default field are not actually
    // images, but contain more images. Recurse to retrieve.
    return getThumbLevel(resource.default, scaledWidth, scaledHeight);
  }

  return {
    url: getThumbUrl(resource, scaledWidth),
    height: height,
    width: width
  };
};

var makeThumbnailConfig = function(resource, parent) {
  var bounds = parent.getBounds();

  return {
    tileSource: {
      type: 'legacy-image-pyramid',
      levels: [
        getThumbLevel(resource, bounds.width, bounds.height),
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

    return new ImageResource(makeThumbnailConfig(canvas.thumbnail, parent));
  }

  // If the canvas has no thumbnail object, we try to fall back to using an image from it.
  // If the canvas has no images and no thumbnail, we can't do anything, so we don't bother.
  if(canvas.images) {
    try {
      var config = makeThumbnailConfig(canvas.images[0].resource, parent);
      return new ImageResource(config);
    } catch (error){
      // If we can't use LegacyTileSource to build the thumbnail, don't build a thumbnail.
      if(error == imageFormatError) {
        return 'A thumbnail cannot be built for this object';
      } else {
        throw (error);
      }
    }
  }
  return undefined;
};

ThumbnailFactory.getThumbUrl = getThumbUrl;

module.exports = ThumbnailFactory;
