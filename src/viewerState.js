var viewerState = function(config) {
  this.updateCallbacks = config.updateCallbacks;

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
    var differences = {};
    for(var key in newState) {
      if(newState.hasOwnProperty(key)) {
        if(this.state[key] !== newState[key]) {
          differences[key] = this.state[key];
          this.state[key] = newState[key];
        }
      }
    }
    if(this.updateCallbacks) {
      this.updateCallbacks.forEach(function(callback) {
        if(callback) {
          callback(differences);
        }
      });
    }
  }
};

module.exports = viewerState;
