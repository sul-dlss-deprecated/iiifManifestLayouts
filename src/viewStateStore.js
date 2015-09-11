'use strict';

var iiif = require('./iiifUtils');

var viewStateStore = function(options) {
  var manifest = options.manifest,
      sequence = options.sequence,
      canvases = options.sequence ? options.sequence.canvases : manifest.sequences[0].canvases,
      container = options.container,
      initialViewingDirection = options.viewingDirection ? options.viewingDirection : iiif.getViewingDirection(manifest),
      initialViewingMode = options.viewingMode ? options.viewingHint : iiif.getViewingHint(manifest),
      initialPerspective = options.perspective ? options.perspective : 'overview',
      selectedCanvas = options.selectedCanvas,
      viewer,
      canvasClass = options.canvasClass ? options.canvasClass : 'canvas',
      frameClass = options.frameClass ? options.frameClass : 'frame',
      labelClass = options.labelClass ? options.labelClass : 'label',
      stateUpdateCallback = options.stateUpdateCallback,
      _canvasState;

      // set the initial state, which triggers the first rendering.
      canvasState({
        canvases: canvases,
        selectedCanvas: selectedCanvas, // @id of the canvas:
        perspective: initialPerspective, // can be 'overview' or 'detail'
        viewingMode: initialViewingMode, // manifest derived or user specified (iiif viewingHint)
        viewingDirection: initialViewingDirection, // manifest derived or user specified (iiif viewingHint)
        width: container.offsetWidth,
        height: container.offsetWidth
      }, true); // "initial" is true here; don't fire the state callback.

  function canvasState(state, initial) {

    if (!arguments.length) return _canvasState;
    _canvasState = state;

    if (stateUpdateCallback && !initial) {
      // should we pass in the state here?
      // I don't really want to encourage reading
      // the state from the event.
      stateUpdateCallback();
    }

    return _canvasState;
  }

  function selectCanvas(item) {
    var state = canvasState();
    state.selectedCanvas = item;
    state.perspective = 'detail';
    canvasState(state);
  }

  function selectPerspective(perspective) {
    var state = canvasState();
    state.perspective = perspective;
    canvasState(state);
  }

  function selectViewingMode(viewingMode) {
    var state = canvasState();
    state.viewingMode = viewingMode;

    canvasState(state);
  }

  function refreshState(newState) {
    var state = canvasState();

    // for blah in blah overwrite blah
    // rather than just setting a specific
    // property.
    canvasState(state);
  }

  function resize() {
    var state = canvasState();

    state.width = container.offsetWidth;
    state.height = container.offsetWidth;

    canvasState(state);
  }

  function updateThumbSize(scaleFactor) {
    var state = canvasState();

    state.scaleFactor = scaleFactor;

    canvasState(state);
  }

  return {
    // selectMode: selectMode,
    // selectPerspective: selectPerspective,
    // next: next,
    // previous: previous,
    // scrollThumbs: scrollThumbs,
    resize: resize,
    selectCanvas: selectCanvas,
    selectPerspective: selectPerspective,
    selectViewingMode: selectViewingMode,
    updateThumbSize: updateThumbSize,
    refreshState: refreshState,
    getState: canvasState,
    setState: canvasState
  };
};

module.exports = viewStateStore;
