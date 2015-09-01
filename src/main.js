'use strict';

var manifestLayout = require('./manifestLayout');
var canvasLayout = require('./canvasLayout');
var iiif = require('./iiifUtils');

var manifestor = function(options) {
  var manifest = options.manifest,
      sequence = options.sequence,
      canvases = options.sequence ? options.sequence.canvases : manifest.sequences[0].canvases,
      container = options.container,
      initialViewingDirection = options.viewingDirection ? options.viewingDirection : getViewingDirection(),
      initialViewingMode = options.viewingMode ? options.viewingHint : getViewingHint(),
      initialPerspective = options.perspective ? options.perspective : 'overview',
      selectedCanvas = options.selectedCanvas,
      viewer,
      canvasClass = options.canvasClass ? options.canvasClass : 'canvas',
      frameClass = options.frameClass ? options.frameClass : 'frame',
      labelClass = options.labelClass ? options.labelClass : 'label',
      stateUpdateCallback = options.stateUpdateCallback,
      _canvasState,
      _canvasImageStates,
      _zooming = false,
      _constraintBounds = {x:0, y:0, width:container.width(), height:container.height()},
      _inZoomConstraints;

  buildCanvasStates(canvases);

  // set the initial state, which triggers the first rendering.
  canvasState({
    selectedCanvas: selectedCanvas, // @id of the canvas:
    perspective: initialPerspective, // can be 'overview' or 'detail'
    viewingMode: initialViewingMode, // manifest derived or user specified (iiif viewingHint)
    viewingDirection: initialViewingDirection, // manifest derived or user specified (iiif viewingHint)
    width: container.width(),
    height: container.height()
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

  function canvasImageStates(state) {

    if (!arguments.length) return _canvasImageStates;
    _canvasImageStates = state;

    // if (!initial) {
    //     jQuery.publish('annotationsTabStateUpdated' + this.windowId, this.tabState);
    // }

    return _canvasImageStates;
  }

  function selectCanvas(item) {
    var state = canvasState();
    state.selectedCanvas = item;
    state.perspective = 'detail';
    canvasState(state);
  }

  function selectPerspective(perspective) {
    var state = canvasState();
    state.previousPerspective = state.perspective;
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

  function addImageCluster(id) {
    var canvases = canvasImageStates();

    canvases[id] = {
    };
  }

  function addDummyObj(id, osdTileObj) {
    var canvasStates = canvasImageStates();

    canvasStates[id].dummyObj = osdTileObj;

    canvasImageStates(canvasStates);
  }

  function buildCanvasStates(canvases) {
    var canvasStates = {};

    canvases.forEach(function(canvas) {
      canvasStates[canvas['@id']] = {
        tileSourceUrl: canvas.images[0].resource.service['@id'] + '/info.json'
      };
    });

    canvasImageStates(canvasStates);
  }

  function resize() {
    var state = canvasState();

    state.width = container.width();
    state.height = container.height();

    canvasState(state);
  }

  function updateThumbSize(scaleFactor) {
    var state = canvasState();

    state.scaleFactor = scaleFactor;

    canvasState(state);
  }

  function updateConstraintBounds(bounds) {
    var state = canvasState();

    // This should probably be integrated into
    // some other type of store, such as
    // one that handles state that is
    // updated in real time (zoom level,
    // current bounds, "_zooming", and
    // this).

    // state.constraintBounds = bounds;
    _constraintBounds = bounds;

    // canvasState(state);
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
    setState: canvasState,
    osd: viewer
  };
};

module.exports = manifestor;
