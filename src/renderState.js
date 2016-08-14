var renderState = function(config) {
  var state = {
    zooming: config.zooming,
    constraintBounds: config.constraintBounds,
    inZoomConstraints: config.inZoomConstraints,
    scrollPosition: config.lastScrollPosition,
    overviewLeft: config.overviewLeft,
    overviewTop: config.overviewTop
  };


  function getState() {
    return state;
  }

  function setState(newState) {
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
