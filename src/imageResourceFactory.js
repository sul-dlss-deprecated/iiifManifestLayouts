'use strict';

var ImageResource = require('./ImageResource');

var _buildImageConfig = function(image) {
  var _getImageTilesource = function(image) {
    if(image.resource.service) {
      return image.resource.service['@id'] + '/info.json';
    } else {
      return image.resource['@id'];
    }
  };

  return {
    tileSource: _getImageTilesource(image)
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
