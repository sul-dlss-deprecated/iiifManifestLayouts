'use strict';

require('openseadragon');
var ImageResource = require('./ImageResource');

var _getSegmentFromUrl = function(url) {
  var urlParts = url.split('#');
  var segment = null;
  if(urlParts.length > 1) { // the url has a segment specified
    var rectArray = urlParts.split('=').split(',');
    segment = new OpenSeadragon.Rect(rectArray[0], rectArray[1], rectArray[2], rectArray[3]);
  }
  return segment;
};

var _buildImageConfig = function(resource) {
  var hasService = !!(resource.service);
  var idObj = resource;
  if(hasService) {
    idObj = resource.service;
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

  var imageTileSource =  _getImageTilesource();

  return {
    tileSource: imageTileSource,
    clipRegion: _getSegmentFromUrl(id),
    dynamic: hasService // todo: it's more complicated than that
  };
};


var _buildChoiceConfigs = function(resource) {

  var _buildImageChoice = function(item, type, zIndex) {
    var config = _buildImageConfig(item);
    config.imageType = type;
    config.label = item.label;
    config.zIndex = zIndex;
    return config;
  }
  var configs = [];
  configs.push(_buildImageChoice(resource.default, 'main', 0));

  resource.item.forEach(function(item) {
    configs.push(_buildImageChoice(item, 'alternate', 1));
  });
  return configs;
};

var ImageResourceFactory = function(image, parent) {
  var resourceType = image.resource['@type']; // can be oa:Choice, oa:SpecificResource, or dctypes:Image

  var _addConfigAttributes = function(config) {
    config.parent = parent;
    config.bounds = _getSegmentFromUrl(image.on);
  };

  switch(resourceType) {
    case 'dctypes:Image':
      var config = _buildImageConfig(image.resource);
      _addConfigAttributes(config);
      return new ImageResource(config);
      break;
    case 'oa:Choice':
      var configs = _buildChoiceConfigs(image.resource);
      return configs.map(function(config) {
        _addConfigAttributes(config);
        return new ImageResource(config);
      });
      break;
    case 'oa:SpecificResource':
      var config = _buildImageConfig(image.resource);
      _addConfigAttributes(config);
      if(image.selector && image.selector.region) {
        var clipArray = image.selector.region.split(',');
        var clipRect = new OpenSeadragon.Rect(clipArray[0], clipArray[1], clipArray[2], clipArray[3]);
        config.clipRegion = clipRect;
        config.zIndex = 0;
      }
      return new ImageResource(config);
      break;
    default:
      throw new Error("Cannot create an image from type " + resourceType);
  }
};

module.exports = ImageResourceFactory;
