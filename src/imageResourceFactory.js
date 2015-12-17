'use strict';

require('openseadragon');
var ImageResource = require('./ImageResource');

var _getSegmentFromUrl = function(url) {
  var urlParts = url.split('#');
  var segment = null;
  if(urlParts.length > 1) { // the url has a segment specified
    var bounds = urlParts[1].split('=');
    var rectArray = bounds[1].split(',').map(function(number) {
      return parseInt(number, 10);
    });

    segment = new OpenSeadragon.Rect(rectArray[0] , rectArray[1], rectArray[2], rectArray[3]);
  }
  return segment;
};

var _buildImageConfig = function(resource) {
  if(resource == 'rdf:nil') {
    return; // You can have a choice of "no image"; this is what it looks like.
  }
  var hasService = !!(resource.service);
  var idObj = resource;
  if(hasService) {
    idObj = resource.service;
  }
  var id = idObj['@id'];

  if(!id && resource.full) {
    return _buildImageConfig(resource.full);
  }

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
    if(config) {
      config.imageType = type;
      config.label = item.label;
      config.zIndex = zIndex;
    }
    return config;
  }
  var configs = [];
  var choice = _buildImageChoice(resource.default, 'main', 0);
  if(choice) {
    configs.push(choice);
  }

  resource.item.forEach(function(item) {
    var choice = _buildImageChoice(item, 'alternate', 1);
    if(choice) {
      configs.push(choice);
    }
  });
  return configs;
};

var ImageResourceFactory = function(image, parent) {
  var resourceType = image.resource['@type']; // can be oa:Choice, oa:SpecificResource, or dctypes:Image

  var _makeCoordinatesPercentages = function(bounds) {
    // We want to deal with these in terms of percentages relative to the canvas.
    return new OpenSeadragon.Rect(
      bounds.x / parent.bounds.width,
      bounds.y / parent.bounds.width,
      bounds.width / parent.bounds.width,
      bounds.height / parent.bounds.height
    );
  };

  var _makeImageFromConfig = function(config) {
    if(config) {
      config.parent = parent;
      var bounds = _getSegmentFromUrl(image.on);
      if(bounds) {
        config.imageType = 'detail';
        config.bounds = _makeCoordinatesPercentages(bounds);
        config.zIndex = 0;
      }
      if(config.clipRegion) {
        config.clipRegion = _makeCoordinatesPercentages(config.clipRegion);
      }
      return new ImageResource(config);
    }
  };

  switch(resourceType) {
    case 'dctypes:Image':
      var config = _buildImageConfig(image.resource);
      return _makeImageFromConfig(config);
      break;
    case 'oa:Choice':
      var configs = _buildChoiceConfigs(image.resource);
      return configs.map(function(config) {
        return _makeImageFromConfig(config);
      });
      break;
    case 'oa:SpecificResource':
      var config = _buildImageConfig(image.resource);
      if(config && image.selector && image.selector.region) {
        var clipArray = image.selector.region.split(',');
        config.clipRegion = new OpenSeadragon.Rect(clipArray[0], clipArray[1], clipArray[2], clipArray[3]);
        config.zIndex = 0;
      }
      return _makeImageFromConfig(config);
      break;
    default:
      throw new Error("Cannot create an image from type " + resourceType);
  }
};

module.exports = ImageResourceFactory;
