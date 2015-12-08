'use strict';

require('openseadragon');
var ImageResource = require('./ImageResource');

var _buildImageConfig = function(image) {
  var _getImageTilesource = function() {
    if(image.resource.service) {
      return image.resource.service['@id'] + '/info.json';
    } else {
      return image.resource['@id'];
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

  var id =  _getImageTilesource(image);

  return {
    tileSource: id,
    clipRegion: _getSegmentFromUrl(id),
    bounds: _getSegmentFromUrl(image.on),
    dynamic: !!(image.resource.service) // todo: it's more complicated than that
  };
};


var _buildChoiceResource = function(choice) {

};

var _buildSpecificResource = function(specificResource) {

};

var ImageResourceFactory = function(image, parent) {
  var resourceType = image.resource['@type']; // can be oa:Choice, oa:SpecificResource, or dctypes:Image
  var config = _buildImageConfig(image);

  config.parent = parent;

  return new ImageResource(config);
};

module.exports = ImageResourceFactory;
