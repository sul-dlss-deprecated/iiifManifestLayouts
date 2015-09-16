'use strict';

var resourceStore = require('./resourceStore');

var canvasStore = function(canvas) {
  var canvasStore = [];

  canvas.images.forEach(function(imageResource, index) {
    var resource = resourceStore(imageResource);

    // at particular index.
    canvasStore[resource.id] = resource;
    canvasStore.push(canvasStore[resource.id]);
  });

  return canvasStore;
};

module.exports = canvasStore;
