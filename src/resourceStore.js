var resourceStore = function(iiifResource, parentCanvas) {
  var resource = {
    id: resource.id,
    tileSource: null,
    type: 'tileSource', // static, tilesource
    status: 'pending',
    x: null,
    y: null,
    width: null,
    height: null,
    opacity: 0,
    visible: false
  };

  resource.setTilesource = function() {
  };

  resource.setOpacity = function() {
  };

  resource.moveUpOne = function() {
  };

  resource.moveDownOne = function() {
  };

  resource.moveTo = function() {
  };

  resource.moveToTop = function() {
  };

  resource.moveToBottom = function() {
  };

  resource.rotate = function() {
  };

  resource.scale = function() {
  };

  resource.translate = function() {
  };

  return resource;
};

module.exports = resourceStore;
