var viewerState = function(config) {
  this.updateCallback = config.updateCallback;

  this.state = {
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
    for(var key in newState) {
      if(newState.hasOwnProperty(key)) {
        this.state[key] = newState[key];
      }
    }
    if(this.updateCallback) {
      this.updateCallback();
    }
  }
};

module.exports = viewerState;
