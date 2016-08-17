var viewerStateStore = require('./viewerState'),
    renderStateStore = require('./renderState'),
    OsdRenderer = require('./osdRenderer'),
    D3Renderer = require('./d3Renderer'),
    events = require('events');

var manifestor = function(options) {
  'use strict';

  var viewerState,
      renderState,
      d3Renderer, // todo: name this better
      osdRenderer,
      dispatcher = new events.EventEmitter();

  dispatcher.setMaxListeners(0);
  options.dispatcher = dispatcher;
  options.width = options.container.offsetWidth;
  options.height = options.container.offsetHeight;

  viewerState = viewerStateStore(options);
  renderState = renderStateStore(options);

  osdRenderer = new OsdRenderer({
    container: options.container,
    dispatcher: dispatcher,
    renderState: renderState,
    viewerState: viewerState
  });

  d3Renderer = D3Renderer({
    dispatcher: dispatcher,
    viewerState: viewerState,
    renderState: renderState,
    container: options.container,
    canvasClass: options.canvasClass || 'canvas',
    frameClass: options.frameClass || 'frame',
    labelClass: options.labelClass || 'label'
  });

  // function scrollHandler(event) {
  //   if (viewerState.getState().perspective === 'overview' && renderState.getState().zooming === false) {
  //     renderState.setState({ lastScrollPosition: $(this).scrollTop() });
  //     osd.setViewerBoundsFromState(true);
  //   }
  // }


  // Do we really want to expose this?
  function setState(state) {
    viewerState.setState(state);
  }

  // function render(event) {
  //   var differences = event.detail;
  //   var userState = viewerState.getState();
  //   var previousPerspective = differences.perspective || userState.perspective;

  //   // Layout is configured from current user state. The
  //   // layout algorithm, viewing hints, animations (such as
  //   // initial layout without animation) are all
  //   // functions of the current user state.
  //   var layout = manifestLayout({
  //     canvases: canvases,
  //     width: userState.width,
  //     height: userState.height,
  //     scaleFactor: userState.scaleFactor,
  //     viewingDirection: userState.viewingDirection,
  //     viewingMode: userState.viewingMode,
  //     canvasHeight: 100,
  //     canvasWidth: 100,
  //     selectedCanvas: userState.selectedCanvas,
  //     framePadding: {
  //       top: 10,
  //       bottom: 40,
  //       left: 10,
  //       right: 10
  //     },
  //     viewportPadding: viewportPadding,
  //     minimumImageGap: 5, // precent of viewport
  //     facingCanvasPadding: 0.1 // precent of viewport
  //   });

  //   var getFrames = function (mode) {
  //     var canvas = viewerState.selectedCanvasObject();
  //     var anchor = canvas.getBounds().getTopLeft();
  //     var frames = layout[mode](anchor);
  //     return frames;
  //   };

  //   var doRender = function (mode, animate) {
  //     if (differences.length === 1 && differences[0] === 'scaleFactor') {
  //       // Immediate-mode changes
  //       // All other properties held constant
  //       animate = false;
  //     }

  //     var frames = getFrames(mode);
  //     // (-_-) ...srsly?
  //     d.renderLayout(frames, animate);
  //     return frames;
  //   };

  //   var frames;

  //   var renderNewPerspective = function(perspective) {
  //     var animate = (perspective === 'detail');

  //     var renderComplete = function() {
  //       // Adding and then removing sets up the two-stage animation.
  //       dispatcher.removeListener('render-layout-complete', renderComplete);
  //       doRender(perspective, !animate);
  //     };
  //     dispatcher.on('render-layout-complete', renderComplete);
  //     frames = doRender('intermediate', animate);
  //   };

  //   if('perspective' in differences) {
  //     renderNewPerspective(userState.perspective);
  //   } else {
  //     var animateRender = ('selectedCanvas' in differences || 'viewingMode' in differences);
  //     frames = doRender(userState.perspective, animateRender);
  //   }

  //   var animateViewport = ('perspective' in differences || 'selectedCanvas' in differences);

  //   var viewBounds;
  //   if (userState.perspective === 'detail') {
  //     viewBounds = frames.filter(function(frame) {
  //       return frame.canvas.selected;
  //     })[0].vantage;

  //     renderState.setState({constraintBounds: viewBounds});
  //     var osdBounds = new OpenSeadragon.Rect(viewBounds.x, viewBounds.y, viewBounds.width, viewBounds.height);
  //     d.setScrollElementEvents();
  //     viewer.viewport.fitBounds(osdBounds, !animateViewport);
  //     osd.enableZoomAndPan();
  //   } else {
  //     renderState.setState({
  //       overviewLeft: frames[0].x - (layout.viewport.width * layout.viewport.padding.left / 100),
  //       overviewTop: frames[0].y - (layout.viewport.height * layout.viewport.padding.top / 100),
  //       zooming: true
  //     });

  //     osd.disableZoomAndPan();
  //     d.setScrollElementEvents();
  //     osd.setViewerBoundsFromState(animateViewport);


  function selectCanvas(canvasId) {
    viewerState.selectedCanvasObject(canvasId);
  }

  function getSelectedCanvas() {
    return viewerState.selectedCanvasObject();
  }

  function selectPerspective(perspective) {
    if (viewerState.getState().perspective !== perspective) {
      viewerState.selectedPerspective(perspective);
    }
  }

  function selectViewingMode(viewingMode) {
    if (viewerState.getState().viewingMode !== viewingMode) {
      viewerState.setState({
        viewingMode: viewingMode
      });
      dispatcher.emit('viewingModeUpdated');
    }
  }

  function selectViewingDirection(viewingDirection) {
    viewerState.setState({
      viewingDirection: viewingDirection
    });
  }

  function resize() {
    viewerState.setState({
      width: options.container.offsetWidth,
      height: options.container.offsetHeight
    });
  }

  function updateThumbSize(scaleFactor) {
    viewerState.setState({
      scaleFactor: scaleFactor
    });
    dispatcher.emit('scaleFactorUpdated');
  }

  function _navigate(forward) {
    // var state = viewerState.getState();
    // var currentCanvasIndex = viewerState.selectedCanvasObject().index;
    // var incrementValue = forward ? 1 : -1;

    // if(state.viewingMode === 'paged') {
    //   canvasUtils.navigatePaged(currentCanvasIndex, incrementValue);
    // } else {
    //   canvasUtils.navigateIndividual(currentCanvasIndex, incrementValue);
    // }
  }

  function next() {
    _navigate(true);
  }

  function previous() {
    _navigate(false);
  }

  return {
    // Actions to update the internal state.
    // setScrollPosition: setScrollPosition,
    next: next,
    previous: previous,
    resize: resize,
    // canvases: viewerState.canvases.bind(viewerState),
    selectCanvas: selectCanvas,
    selectPerspective: selectPerspective,
    selectViewingMode: selectViewingMode,
    selectViewingDirection: selectViewingDirection,
    updateThumbSize: updateThumbSize,
    on: function on(event, handler) {
      dispatcher.on(event, handler);
    },

    // Convenience methods for reading state
    getSelectedCanvas: getSelectedCanvas,
    getState: function() {
      return viewerState.getState();
    },
    setState: setState,
    osd: osdRenderer.viewer
  };
};

module.exports = manifestor;
