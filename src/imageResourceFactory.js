'use strict';

require('openseadragon');
var ImageResource = require('./ImageResource');

var _buildImageConfig = function(image) {
  var hasService = !!(image.resource.service);
  var idObj = image.resource;
  if(hasService) {
    idObj = image.resource.service;
  }
  var id = idObj['@id'];

  var _getImageTilesource = function() {
    if(hasService) {
      return id + '/info.json';
    } else {
      return {
        type: 'image',
        url: id
      };
    }
  };

  var _getSegmentFromUrl = function(url) {
    var urlParts = url.split('#');
    var segment = null;
    if(urlParts.length > 1) { // the url has a segment specified
      var rectArray = urlParts.split('=').split(',');
      segment = new OpenSeadragon.Rect(rectArray[0], rectArray[1], rectArray[2], rectArray[3]);
    }
    return segment;
  };


  var imageTileSource =  _getImageTilesource(image);

  return {
    tileSource: imageTileSource,
    clipRegion: _getSegmentFromUrl(id),
    bounds: _getSegmentFromUrl(image.on),
    dynamic: hasService // todo: it's more complicated than that
  };
};


var _buildChoiceConfig = function(choice) {

};

var _buildSpecificConfig = function(specificResource) {

};

var ImageResourceFactory = function(image, parent) {
  var resourceType = image.resource['@type']; // can be oa:Choice, oa:SpecificResource, or dctypes:Image
  var config = {};

  switch(resourceType) {
    case 'dctypes:Image':
      config = _buildImageConfig(image);
      break;
    case 'oa:Choice':
      console.log('oa:Choice!', image);
      config = _buildChoiceConfig(image);
      break;
    case 'oa:SpecificResource':
      console.log('specific resource!', image);
      config = _buildSpecificConfig(image);
      break;
    default:
      throw new Error("Cannot create an image from type " + resourceType);
  }

  config.parent = parent;
  return new ImageResource(config);
};

module.exports = ImageResourceFactory;
