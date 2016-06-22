var d3 = require('./lib/d3-slim-dist'),
    manifestLayout = require('./manifestLayout'),
    canvasLayout = require('./canvasLayout'),
    CanvasObject = require('./canvasObject'),
    CanvasUtils = require('./canvasUtils'),
    ViewerState = require('./viewerState'),
    RenderState = require('./renderState'),
    OSDUtils = require('./osdUtils'),
    d3Utils = require('./d3Utils'),
    iiif = require('./iiifUtils'),
    events = require('events');

var manifestor = function(options) {
  'use strict';

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
      viewerState,
      renderState,
      d, // todo: name this better
      osd = new OSDUtils(),
      viewer,
      canvasUtils,
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

  _dispatcher.setMaxListeners(0);

  var fullSizeStyle = {
    'width': '100%',
    'height': '100%',
    'position': 'absolute',
    'top': 0,
    'left': 0
  };

  var overlays = $('<div class="overlaysContainer">').css(fullSizeStyle);
  var osdContainer = $('<div class="osd-container">').css(fullSizeStyle);

  fullSizeStyle.overflow = 'hidden';
  fullSizeStyle['overflow-x'] = 'hidden';

  var scrollContainer = $('<div class="scroll-container">').css(fullSizeStyle);

  container.append(osdContainer);
  container.append(scrollContainer);
  scrollContainer.append(overlays);

  viewer = osd.initOSD(osdContainer);
  canvasUtils = new CanvasUtils({
    canvases: canvases,
    viewer: viewer,
    dispatcher: _dispatcher
  });

  viewerState = viewerState || new ViewerState({
    dispatcher: _dispatcher,
    canvasObjects: canvasUtils.canvasObjects,
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
    dispatcher: _dispatcher,
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


  function scrollHandler(event) {
    if (viewerState.getState().perspective === 'overview' && renderState.getState().zooming === false) {
      renderState.setState({ lastScrollPosition: $(this).scrollTop() });
      osd.setViewerBoundsFromState(true);
    }
  }

  scrollContainer.on('scroll', scrollHandler);

  d3.timer(function() {
    if (_destroyed) {
      return true;
    }

    viewer.forceRedraw();
    return false;
  });

  function getState() {
    return viewerState.getState();
  }

  // Do we really want to expose this?
  function setState(state) {
    viewerState.setState(state);
  }

  function render(event) {
    var differences = event.detail;
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

    var doRender = function (mode, animate) {
      if (differences.length === 1 && differences[0] === 'scaleFactor') {
        animate = false;
      }

      var frames = getFrames(mode);
      d.renderLayout(frames, animate);
      return frames;
    };

    var frames;

    var renderNewPerspective = function(perspective) {
      var animate = (perspective === 'detail');
      var renderComplete = function() {
        _dispatcher.removeListener('render-layout-complete', renderComplete);
        doRender(perspective, !animate);
      };
      _dispatcher.on('render-layout-complete', renderComplete);
      frames = doRender('intermediate', animate);
    };

    if('perspective' in differences) {
      renderNewPerspective(userState.perspective);
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

  _dispatcher.on('viewer-state-updated', render);

  function selectCanvas(item) {
    viewerState.selectedCanvasObject(item);
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

  function _navigate(forward) {
    var state = viewerState.getState();
    var currentCanvasIndex = viewerState.selectedCanvasObject().index;
    var incrementValue = forward ? 1 : -1;

    if(state.viewingMode === 'paged') {
      canvasUtils.navigatePaged(currentCanvasIndex, incrementValue);
    } else {
      canvasUtils.navigateIndividual(currentCanvasIndex, incrementValue);
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

    viewerState = null;
    renderState = null;

    d = null;
    canvasUtils = null;

    _destroyed = true; // cancels the timer
  }

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
    // selectLayoutStrategy: selectLayoutStrategy,
    updateThumbSize: updateThumbSize,
    getState: getState,
    setState: setState,
    osd: viewer,
    on: on,
    getSelectedCanvas: getSelectedCanvas
  };
};

module.exports = manifestor;
