var renderState = function(config) {
  this.state = {
    zooming: config.zooming,
    constraintBounds: config.constraintBounds,
    inZoomConstraints: config.inZoomConstraints,
    lastScrollPosition: config.lastScrollPosition,
    overviewLeft: config.overviewLeft,
    overviewTop: config.overviewTop
  };
};

renderState.prototype = {
  getState: function() {
    return this.state;
  },

  setState: function(newState) {
    for(var key in newState) {
      if(newState.hasOwnProperty(key)) {
        if(this.state[key] !== newState[key]) {
          this.state[key] = newState[key];
        }
      }
    }
  }
};

module.exports = renderState;
