'use strict';

var d3 = require('./lib/d3-slim-dist');
var manifestLayout = require('./manifestLayout');
var canvasLayout = require('./canvasLayout');
var CanvasObject = require('./canvasObject');
var ViewerState = require('./viewerState');
var RenderState = require('./renderState');
var OSDUtils = require('./osdUtils');
var d3Utils = require('./d3Utils');
var iiif = require('./iiifUtils');
var events = require('events');

var manifestor = function(options) {
  var manifest = options.manifest,
      sequence = options.sequence,
      canvases = options.sequence ? options.sequence.canvases : manifest.sequences[0].canvases,
      container = options.container,
      initialViewingDirection = options.viewingDirection ? options.viewingDirection : getViewingDirection(),
      initialViewingMode = options.viewingMode ? options.viewingHint : getViewingHint(),
      initialPerspective = options.perspective ? options.perspective : 'overview',
      selectedCanvas = options.selectedCanvas || iiif.getFirst(canvases),
      canvasClass = options.canvasClass || 'canvas',
      frameClass = options.frameClass || 'frame',
      labelClass = options.labelClass || 'label',
      viewportPadding = options.viewportPadding,
      stateUpdateCallback = options.stateUpdateCallback,
      viewerState,
      renderState,
      d, // todo: name this better
      osd,
      viewer,
      _dispatcher = new events.EventEmitter(),
      _destroyed = false;

  function getViewingDirection() {
    if (sequence && sequence.viewingDirection) {
      return sequence.viewingDirection;
    }
    return manifest.viewingDirection ? manifest.viewingDirection : 'left-to-right';
  }

  function getViewingHint() {
    if (sequence && sequence.viewingHint) {
      return sequence.viewingHint;
    }
    return manifest.viewingHint ? manifest.viewingHint : 'individuals';
  }

  function on(event, handler) {
    _dispatcher.on(event, handler);
  }

  // Each canvas will listen when it opens tile sources, and clients consuming this code may attach some as well.
  _dispatcher.setMaxListeners(canvases.length + 30);

  var overlays = $('<div class="overlaysContainer">').css(
    {'width': '100%',
     'height': '100%',
     'position': 'absolute',
     'top': 0,
     'left': 0
    });
  var osdContainer = $('<div class="osd-container">').css(
    {'width': '100%',
     'height': '100%',
     'position': 'absolute',
     'top': 0,
     'left': 0
    });
  var scrollContainer = $('<div class="scroll-container">').css(
    {'width': '100%',
     'height': '100%',
     'position': 'absolute',
     'top': 0,
     'left': 0,
     'overflow': 'hidden',
     'overflow-x': 'hidden'
     // 'overflow-y': 'scroll'
    });

  container.append(osdContainer);
  container.append(scrollContainer);
  scrollContainer.append(overlays);

  osd = new OSDUtils();

  viewer = osd.initOSD(osdContainer);

  viewerState = viewerState || new ViewerState({
    updateCallbacks: [render, stateUpdateCallback],
    canvasObjects: buildCanvasStates(canvases, viewer),
    selectedCanvas: selectedCanvas, // @id of the canvas:
    perspective: initialPerspective, // can be 'overview' or 'detail'
    viewingMode: initialViewingMode, // manifest derived or user specified (iiif viewingHint)
    viewingDirection: initialViewingDirection, // manifest derived or user specified (iiif viewingHint)
    width: container.width(),
    height: container.height()
  });
  renderState = renderState || new RenderState({
    zooming: false,
    constraintBounds: {x:0, y:0, width:container.width(), height:container.height()},
    inZoomConstraints: false,
    lastScrollPosition: $(this).scrollTop(),
    overviewLeft: 0,
    overviewTop: 0
  });

  d = new d3Utils({
    viewerState: viewerState,
    renderState: renderState,
    scrollContainer: scrollContainer,
    overlays: overlays,
    canvasClass: canvasClass,
    frameClass: frameClass,
    labelClass: labelClass
  });

  osd.addOSDHandlers(viewerState, renderState);
  viewer.addHandler('animation', function(event) {
    // Synchronise d3 canvases with OSD zoom events.
    d.scaleForZoom(osd.getViewerScale(), osd.getZoomTranslation());
  });

  d3.timer(function() {
    if (_destroyed) {
      return true;
    }

    viewer.forceRedraw();
  });

  function getState() {
    return viewerState.getState();
  };

  // Do we really want to expose this?
  function setState(state) {
    viewerState.setState(state);
  }

  function render(differences) {
    var userState = viewerState.getState();
    var previousPerspective = differences.perspective || userState.perspective;

    // Layout is configured from current user state. The
    // layout algorithm, viewing hints, animations (such as
    // initial layout without animation) are all
    // functions of the current user state.
    var layout = manifestLayout({
      canvases: canvases,
      width: userState.width,
      height: userState.height,
      scaleFactor: userState.scaleFactor,
      viewingDirection: userState.viewingDirection,
      viewingMode: userState.viewingMode,
      canvasHeight: 100,
      canvasWidth: 100,
      selectedCanvas: userState.selectedCanvas,
      framePadding: {
        top: 10,
        bottom: 40,
        left: 10,
        right: 10
      },
      viewportPadding: viewportPadding,
      minimumImageGap: 5, // precent of viewport
      facingCanvasPadding: 0.1 // precent of viewport
    });

    var getFrames = function (mode) {
      var canvas = viewerState.selectedCanvasObject();
      var anchor = canvas.getBounds().getTopLeft();
      var frames = layout[mode](anchor);
      return frames;
    };

    var doRender = function (mode, animate, callback) {
      if (differences.length === 1 && differences[0] === 'scaleFactor') {
        animate = false;
      }

      var frames = getFrames(mode);
      d.renderLayout(frames, animate, callback);
      return frames;
    };

    var frames;

    if (userState.perspective === 'detail' && previousPerspective === 'overview') {
      frames = doRender('intermediate', true, function() {
        doRender('detail', false);
      });
    } else if (userState.perspective === 'overview' && previousPerspective === 'detail') {
      frames = getFrames('overview');
      doRender('intermediate', false, function() {
        doRender('overview', true);
      });
    } else {
      var animateRender = ('selectedCanvas' in differences || 'viewingMode' in differences);
      frames = doRender(userState.perspective, animateRender);
    }

    var animateViewport = ('perspective' in differences || 'selectedCanvas' in differences);

    var viewBounds;
    if (userState.perspective === 'detail') {
      viewBounds = frames.filter(function(frame) {
        return frame.canvas.selected;
      })[0].vantage;

      renderState.setState({constraintBounds: viewBounds});
      var osdBounds = new OpenSeadragon.Rect(viewBounds.x, viewBounds.y, viewBounds.width, viewBounds.height);
      d.setScrollElementEvents();
      viewer.viewport.fitBounds(osdBounds, !animateViewport);
      osd.enableZoomAndPan();
    } else {
      renderState.setState({
        overviewLeft: frames[0].x - (layout.viewport.width * layout.viewport.padding.left / 100),
        overviewTop: frames[0].y - (layout.viewport.height * layout.viewport.padding.top / 100),
        zooming: true
      });

      osd.disableZoomAndPan();
      d.setScrollElementEvents();
      osd.setViewerBoundsFromState(!animateViewport);

      setTimeout(function(){ // Do we want this to happen based on an event instead?
        renderState.setState({zooming: false});
        d.setScrollElementEvents();
      }, 1200);
    }
  }

  function selectCanvas(item) {
    var item = viewerState.getState().canvasObjects[item];
    item.openMainTileSource();
    viewerState.setState({
      selectedCanvas: item.id,
      perspective: 'detail'
    });
    _dispatcher.emit('canvas-selected', { detail: item });
  }

  function getSelectedCanvas() {
    return viewerState.selectedCanvasObject();
  }

  function selectPerspective(perspective) {
    viewerState.setState({
      perspective: perspective
    });
  }

  function selectViewingMode(viewingMode) {
    viewerState.setState({
      viewingMode: viewingMode
    });
  }

  function selectViewingDirection(viewingDirection) {
    viewerState.setState({
      viewingDirection: viewingDirection
    });
  }

  function addImageCluster(id) {
    var canvases = viewerState.getState().canvasObjects;

    canvases[id] = {
    };
  }

  function buildCanvasStates(canvases, viewer) {
    var canvasObjects = {};

    canvases.forEach(function(canvas, index) {
     canvasObjects[canvas['@id']] = new CanvasObject({
       canvas: canvas,
       index: index,
       dispatcher: _dispatcher,
       viewer: viewer
     });
    });

    return canvasObjects;
  }

  function resize() {
    viewerState.setState({
      width: container.width(),
      height: container.height()
    });
  }

  function updateThumbSize(scaleFactor) {
    viewerState.setState({
      scaleFactor: scaleFactor
    });
  }

  function _isValidCanvasIndex(index) {
    return(index > 0 && index < canvases.length);
  }

  function _loadTileSourceForIndex(index) {
    var canvasId = canvases[index]['@id'];
    viewerState.getState().canvasObjects[canvasId].openMainTileSource();
  }

  function _selectCanvasForIndex(index) {
    var canvasId = canvases[index]['@id'];
    selectCanvas(canvasId);
  }

  var getCanvasByIndex = function(index) {
    var canvasId = canvases[index]['@id'];
    return viewerState.getState().canvasObjects[canvasId];
  };

  function _navigatePaged(currentIndex, incrementValue) {
    var newIndex = currentIndex + incrementValue;

    if (currentIndex % 2 !== 0) {
      newIndex = currentIndex + (2 * incrementValue);
    }

    // return if newIndex is out of range
    if (!_isValidCanvasIndex(newIndex)) {
      return;
    }

    // Do not select non-paged canvases in paged mode. Instead, find the next available
    // canvas that does not have that viewingHint.
    var newCanvas = getCanvasByIndex(newIndex);
    while(newCanvas.viewingHint === 'non-paged' && _isValidCanvasIndex(newIndex)) {
      newIndex += incrementValue;
      newCanvas = getCanvasByIndex(newIndex);
    }

    _loadTileSourceForIndex(newIndex);

    // Load tilesource for the non-selected side of the pair, if it exists
    var facingPageIndex = newIndex + incrementValue;
    if(_isValidCanvasIndex(facingPageIndex)) {
      _loadTileSourceForIndex(facingPageIndex);
    }

    _selectCanvasForIndex(newIndex);
  }

  function _navigateIndividual(currentIndex, incrementValue) {
    var newIndex = currentIndex + incrementValue;

    // do nothing if newIndex is out of range
    if (_isValidCanvasIndex(newIndex)) {
      _loadTileSourceForIndex(newIndex);
      _selectCanvasForIndex(newIndex);
    }
  }

  function _navigate(forward) {
    var state = viewerState.getState();
    var currentCanvasIndex = viewerState.selectedCanvasObject().index;
    var incrementValue = forward ? 1 : -1;

    if(state.viewingMode === 'paged') {
      _navigatePaged(currentCanvasIndex, incrementValue);
    } else {
      _navigateIndividual(currentCanvasIndex, incrementValue);
    }
  }

  function next() {
    _navigate(true);
  }

  function previous() {
    _navigate(false);
  }

  function destroy() {
    // TODO: is there more cleanup needed?
    if (viewer) {
      viewer.destroy();
    }
    osd = null;

    overlays.remove();
    scrollContainer.remove();
    osdContainer.remove();
    container.off('click', canvasClickHandler);

    viewerState = null;
    renderState = null;

    d = null;

    _destroyed = true; // cancels the timer
  }

  function canvasClickHandler(event) {
    selectCanvas($(this).data('id'));
  }

  function scrollHandler(event) {
    if (viewerState.getState().perspective === 'overview' && renderState.getState().zooming === false) {
      renderState.setState({ lastScrollPosition: $(this).scrollTop() });
      osd.setViewerBoundsFromState(true);
    }
  };

  container.on('click', '.' + canvasClass, canvasClickHandler);
  scrollContainer.on('scroll', scrollHandler);

  return {
    destroy: destroy,
    // scrollThumbs: scrollThumbs,
    next: next,
    previous: previous,
    resize: resize,
    selectCanvas: selectCanvas,
    selectPerspective: selectPerspective,
    selectViewingMode: selectViewingMode,
    selectViewingDirection: selectViewingDirection,
    updateThumbSize: updateThumbSize,
    getState: getState,
    setState: setState,
    osd: viewer,
    on: on,
    getSelectedCanvas: getSelectedCanvas
  };
};

module.exports = manifestor;
