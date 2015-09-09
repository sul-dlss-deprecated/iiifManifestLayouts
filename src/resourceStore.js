var resourceStore = function(resourceUrl, resourceMask) {
  var resource = {
    id: resource.id,
    tileSource: null,
    type: 'tileSource', // static, tilesource
    status: 'pending',
    x: null,
    y: null,
    width: null,
    height: null,
    opactity: 0
  };

  resource.setTilesource = function() {
  };

  resource.setOpacity = function() {
  };

  return resource;
};

module.exports = resourceStore;
