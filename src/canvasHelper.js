var iiif = require('./iiifUtils'),
    canvasStore = require('./resourceStore');

var canvasHelper = function(canvases) {
  var canvasHelper = {};

  canvases.forEach(function(canvas) {
    canvasHelper[canvas['@id']] = canvasStore(canvas);
  });

  return canvasHelper;
};

module.exports = canvasHelper;
