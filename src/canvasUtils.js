var CanvasObject = require('./canvasObject');

var CanvasUtils = function(config) {
  'use strict';

  var self = this;

  function buildCanvasStates(canvases, viewer, dispatcher) {
    var canvasObjects = {};

    canvases.forEach(function(canvas, index) {
     canvasObjects[canvas['@id']] = new CanvasObject({
       canvas: canvas,
       index: index,
       dispatcher: dispatcher,
       viewer: viewer
     });
    });

    return canvasObjects;
  }
  this.canvases = config.canvases;
  this.dispatcher = config.dispatcher;
  this.canvasObjects = buildCanvasStates(this.canvases, config.viewer, this.dispatcher);

  this.dispatcher.on('canvas-selected', function(actionDetails) {
    self.selectCanvas(actionDetails.detail);
  });
};

CanvasUtils.prototype = {
  selectCanvas: function(item) {
    item = this.canvasObjects[item];
    // item.openMainTileSource();
    // propagate this from the canvas somehow.
  },

  isValidCanvasIndex: function(index) {
    return(index > 0 && index < this.canvases.length);
  },

  loadTileSourceForIndex: function(index) {
    var canvasId = this.canvases[index]['@id'];
    // this.canvasObjects[canvasId].openMainTileSource();
    // send this as an event, let some renderer handle it.
  },

  selectCanvasForIndex: function(index) {
    var canvasId = this.canvases[index]['@id'];
    this.selectCanvas(canvasId);
  },

  navigatePaged: function(currentIndex, incrementValue) {
    // Simply set which ones are "needed", let osd do the rest.
    var self = this;
    var newIndex = currentIndex + incrementValue;

    if (currentIndex % 2 !== 0) {
      newIndex = currentIndex + (2 * incrementValue);
    }

    // return if newIndex is out of range
    if (!this.isValidCanvasIndex(newIndex)) {
      return;
    }

    var getCanvasByIndex = function(index) {
      var canvasId = self.canvases[index]['@id'];
      return self.canvasObjects[canvasId];
    };

    // Do not select non-paged canvases in paged mode. Instead, find the next available
    // canvas that does not have that viewingHint.
    var newCanvas = getCanvasByIndex(newIndex);
    while(newCanvas.viewingHint === 'non-paged' && this.isValidCanvasIndex(newIndex)) {
      newIndex += incrementValue;
      newCanvas = getCanvasByIndex(newIndex);
    }

    this.loadTileSourceForIndex(newIndex);

    // Load tilesource for the non-selected side of the pair, if it exists
    var facingPageIndex = newIndex + incrementValue;
    if(this.isValidCanvasIndex(facingPageIndex)) {
      this.loadTileSourceForIndex(facingPageIndex);
    }

    self.electCanvasForIndex(newIndex);
  },

  navigateIndividual: function(currentIndex, incrementValue) {
    var newIndex = currentIndex + incrementValue;

    // do nothing if newIndex is out of range
    if (this.isValidCanvasIndex(newIndex)) {
      this.loadTileSourceForIndex(newIndex);
      this.selectCanvasForIndex(newIndex);
    }
  }
};

module.exports = CanvasUtils;
