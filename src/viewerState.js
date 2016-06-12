'use strict';

var canvasUtils = require('./canvasUtils');

var viewerState = function(config) {
  var self = this;
  this.dispatcher = config.dispatcher;

  this.state = {
    canvasObjects: config.canvasObjects,
    selectedCanvas: config.selectedCanvas, // @id of the canvas:
    perspective: config.perspective, // can be 'overview' or 'detail'
    viewingMode: config.viewingMode, // manifest derived or user specified (iiif viewingHint)
    viewingDirection: config.viewingDirection, // manifest derived or user specified (iiif viewingHint)
    width: config.width,
    height: config.height
  };
};

viewerState.prototype = {
  getState: function() {
    return this.state;
  },

  setState: function(newState) {
    var differences = {};
    for(var key in newState) {
      if(newState.hasOwnProperty(key)) {
        if(this.state[key] !== newState[key]) {
          differences[key] = this.state[key];
          this.state[key] = newState[key];
        }
      }
    }
    this.dispatcher.emit('viewer-state-updated', {detail: differences});
  },

  selectedCanvasObject: function(newCanvas) {
    if (!arguments.length) {
      return this.state.canvasObjects[this.state.selectedCanvas];
    } else  {
      this.setState({
        selectedCanvas: newCanvas,
        perspective: 'detail'
      });
      this.dispatcher.emit('canvas-selected', { detail: newCanvas });
      return this.state.canvasObjects[this.state.selectedCanvas];
    }
  }
};

module.exports = viewerState;
