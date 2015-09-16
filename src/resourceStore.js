'use strict';

var iiif = require('./iiifUtils');

var resourceStore = function(iiifResource, parentCanvas) {
  // If the resource has type annotation, then it is
  // either a dynamic service-backed image, or it is
  // a static image. In both cases, the @id of the
  // RESOURCE (not the "image") is what ought to be
  // used. In both cases, the height, width, x, and y
  // are taken from properties of the IMAGE, (not the
  // resource).
  // The x and y can be determined in a variety of ways.
  // There is the selector syntax in the @id (must be
  // checked for), and there is the official selector
  // syntax.
  // If, instead, it has type oa:choice, then it will
  // have a default which is a resource, and then
  // an array of "items". Each of these is to be
  // treated as a resource (as above).
  var resource = {
    id: iiifResource['@id'],
    thumbUrl: getThumb(iiifResource),
    tileSource: osdTileSourceFromIiifImage(iiifResource),
    osdImage: null,
    type: 'tileSource', // static, tilesource
    status: null,
    localX: null,
    localY: null,
    width: null,
    height: null,
    opacity: 0,
    visible: false
  };

  resource.setOsdImageObj = function(imageObj) {
    resource.osdImage = imageObj;
  };

  function getThumb() {
  }

  function osdTileSourceFromIiifImage(iiifImageResource, staticImage) {
    if (staticImage) {
      return {
        type: 'legacy-image-pyramid',
        levels: [
          {
            url: iiif.get,
            width: iiifImageResource.width,
            height: iiifImageResource.height
          }
        ]
      };
    }
    return iiifResource.resource.service['@id'] + '/info.json';
  }

  return resource;
};

module.exports = resourceStore;
