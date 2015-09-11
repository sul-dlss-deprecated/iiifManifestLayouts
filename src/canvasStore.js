var iiif = require('./iiifUtils'),
    resourceStore = require('./resourceStore');

var canvasStore = function(canvases) {
  var canvasStore = [];

  canvases.forEach(function(canvas) {
    canvasHelper[canvas['@id']] = canvasStore(canvas);
  });
  canvasStore.thumb = '',
  canvasStore.main = '';

  return canvasStore;
};

module.exports = canvasStore;
