'use strict';

var manifestLayout = require('./manifestLayout');
var d3 = require('./lib/d3-slim-dist');

function transitionStore(coreState, dispatcher) {
  var _transitionState;

  // set initial state
  transitionState({
    targetLayout: layoutFromState(coreState.getState()),
    targetViewportProperties: {
      x: 0,
      y: 0,
      width: coreState.getState().width,
      height: coreState.getState().height
    }
  });

  dispatcher.on('coreStateUpdated', parseChange);

  function transitionState(state, initial) {

    if (!arguments.length) return _transitionState;
    _transitionState = state;

    return _transitionState;
  }

  function parseChange() {
    var appState = coreState.getState();
    transitionState({
      targetLayout: layoutFromState(appState),
      targetViewportProperties: {
        x: 0,
        y: 0,
        width: appState.width,
        height: appState.height
      }
    });
    dispatcher.emit('transitionStateUpdated');
    // if (userState.perspective === 'detail' && userState.previousPerspective === 'overview') {
    //   var endCallback = function() {
    //     renderLayout(layout.overview(), false);
    //   };
    //   renderLayout(layout.intermediate(), true, endCallback);
    // } else if (userState.perspective === 'overview' && userState.previousPerspective === 'detail'){
    //   endCallback = function() {
    //     renderLayout(layout.overview(), false);
    //   };
    //   renderLayout(layout.intermediate(), false, endCallback);
    // } else if (userState.perspective === 'detail' && userState.perspective === 'detail'){
    //   renderLayout(layout.intermediate(), false);
    // } else {
    //   renderLayout(layout.overview(), true);
    // }
  }

  function layoutFromState(appState) {
    console.log(appState);
    return manifestLayout({
      canvases: appState.canvases,
      width: appState.width,
      height:coreState.height,
      scaleFactor: coreState.scaleFactor,
      viewingDirection: coreState.viewingd,
      viewingMode: coreState.viewingMode,
      canvasHeight: 100,
      canvasWidth: 100,
      selectedCanvas: coreState.selectedCanvas,
      framePadding: {
        top: 10,
        bottom: 40,
        left: 10,
        right: 10
      },
      containerPadding: {
        top: 50,
        bottom: 130,
        left: 200,
        right: 10
      },
      minimumImageGap: 5, // precent of viewport
      facingCanvasPadding: 1 // precent of viewport
    });
  }

  return {
    getState: transitionState
  };
};

module.exports = transitionStore;
