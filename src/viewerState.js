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

  // Listen for actions. This wrapper responds to asynchronous
  // processes and "actions", as distinct from "events"
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
      this.state.canvasObjects[this.state.selectedCanvas].images.filter(function(image) {
        console.log(image.getImageType());
        return (image.getImageType() === 'main');
      }).forEach(function(image) {
        console.log('deep in the forEach');
        console.log(image);
        image.show();
      });
      this.dispatcher.emit('canvas-selected', { detail: newCanvas });
      return this.state.canvasObjects[this.state.selectedCanvas];
    }
  }
};

module.exports = viewerState;
