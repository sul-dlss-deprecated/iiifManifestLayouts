var ImageResource = require('./ImageResource');
var ThumbnailFactory = require('./ThumbnailFactory');

var _getRectFromStringArray = function(arr) {
  var rectArray = arr.map(function(number) {
    return parseInt(number, 10);
  });

  return {
    x: rectArray[0],
    y: rectArray[1],
    width: rectArray[2],
    height: rectArray[3]
  };
};

var _getSegmentFromUrl = function(url) {
  var urlParts = url.split('#');
  var segment = null;
  if(urlParts.length > 1) { // the url has a segment specified
    var bounds = urlParts[1].split('=');
    segment = _getRectFromStringArray(bounds[1].split(','));
  }
  return segment;
};

var _buildImageConfig = function(resource) {
  if(resource == 'rdf:nil') {
    return; // You can have a choice of "no image"; this is what it looks like.
  }

  if(resource.full) {
    return _buildImageConfig(resource.full);
  }

  // determine whether the resource is dynamic
  var _isDynamic = function() {
    return (!!(resource.service) &&
    resource.service['@context'] == "http://iiif.io/api/image/2/context.json" &&
    !resource.service.width);
  };

  var isDynamic = _isDynamic();

  var idObj = resource;
  if (isDynamic) {
    idObj = resource.service;
  }
  var id = idObj['@id'];

  var _getImageTilesource = function() {
    if (isDynamic) {
      return id + '/info.json';
    } else {
      return {
        type: 'image',
        url: id
      };
    }
  };

  console.log(_getImageTilesource());

  return {
    // the ID is to use in the DOM, so remove special characters. The URL may not be unique, so add a salt.
    id: id.replace(/[^a-z0-9-_]+/gi, "") + Math.floor(Math.random() * 1000),
    label: resource.label,
    tileSource: _getImageTilesource(),
    clipRegion: _getSegmentFromUrl(id),
    dynamic: isDynamic,
    thumbUrl: ThumbnailFactory.getThumbUrl(resource, 200)
  };
};


var _buildChoiceConfigs = function(resource) {

  var _buildImageChoice = function(item, type) {
    var config = _buildImageConfig(item);
    if(config) {
      config.imageType = type;
    }
    return config;
  };
  var configs = [];
  var choice = _buildImageChoice(resource.default, 'main');
  if(choice) {
    configs.push(choice);
  }

  resource.item.forEach(function(item) {
    var choice = _buildImageChoice(item, 'alternate');
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
    return {
      x: bounds.x / parent.bounds.width,
      y: bounds.y / parent.bounds.width,
      width: bounds.width / parent.bounds.width,
      height: bounds.height / parent.bounds.height
    };
  };

  var _makeImageFromConfig = function(config) {
    if(config) {
      config.parent = parent;
      var bounds = _getSegmentFromUrl(image.on);
      if(bounds) {
        config.imageType = 'detail';
        config.bounds = _makeCoordinatesPercentages(bounds);
      }
      return new ImageResource(config);
    }
  };

  switch(resourceType) {
  case 'dctypes:Image':
  case 'dcTypes:Image':
  case 'dcterms:Image':
  case 'dcTerms:Image':
    var config = _buildImageConfig(image.resource, parent);
    return _makeImageFromConfig(config);
  case 'oa:Choice':
    var configs = _buildChoiceConfigs(image.resource);
    return configs.map(function(config) {
      return _makeImageFromConfig(config);
    });
  case 'oa:SpecificResource':
    var resource = image.resource;
    config = _buildImageConfig(resource);

    if(config && resource.selector && resource.selector.region) {
      var clipArray = resource.selector.region.split(',');
      config.clipRegion = _getRectFromStringArray(clipArray);
    }
    return _makeImageFromConfig(config);
  default:
    throw new Error("Cannot create an image from type " + resourceType);
  }
};

module.exports = ImageResourceFactory;
