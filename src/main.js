'use strict';

var d3 = require('./lib/d3-slim-dist');
var manifestLayout = require('./manifestLayout');
var canvasLayout = require('./canvasLayout');
var CanvasObject = require('./canvasObject');
var ViewerState = require('./viewerState');
var RenderState = require('./renderState');
var iiif = require('./iiifUtils');
var events = require('events');
require('openseadragon');

var manifestor = function(options) {
  var manifest = options.manifest,
      sequence = options.sequence,
      canvases = options.sequence ? options.sequence.canvases : manifest.sequences[0].canvases,
      container = options.container,
      initialViewingDirection = options.viewingDirection ? options.viewingDirection : getViewingDirection(),
      initialViewingMode = options.viewingMode ? options.viewingHint : getViewingHint(),
      initialPerspective = options.perspective ? options.perspective : 'overview',
      selectedCanvas = options.selectedCanvas || iiif.getFirst(canvases),
      viewer,
      canvasClass = options.canvasClass ? options.canvasClass : 'canvas',
      frameClass = options.frameClass ? options.frameClass : 'frame',
      labelClass = options.labelClass ? options.labelClass : 'label',
      viewportPadding = options.viewportPadding,
      stateUpdateCallback = options.stateUpdateCallback,
      viewerState,
      renderState,
      _canvasObjects,
      _dispatcher = new events.EventEmitter(),
      _destroyed = false,
      _overviewLeft = 0, // for render state
      _overviewTop = 0, // for render state
      _transitionZoomLevel = 0.01;

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
  initOSD();
  viewerState = viewerState || new ViewerState({
    updateCallback: render,
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
    lastScrollPosition: $(this).scrollTop()
  })
  buildCanvasStates(canvases, viewer);

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

    // console.log('[render] state differences', differences);

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
      var canvas = _canvasObjects[userState.selectedCanvas];
      var anchor = canvas.getBounds().getTopLeft();
      var frames = layout[mode](anchor);
      return frames;
    };

    var doRender = function (mode, animate, callback) {
      if (differences.length === 1 && differences[0] === 'scaleFactor') {
        animate = false;
      }

      var frames = getFrames(mode);
      renderLayout(frames, animate, callback);
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
      setScrollElementEvents();
      viewer.viewport.fitBounds(osdBounds, !animateViewport);
      enableZoomAndPan();
    } else {
      _overviewLeft = frames[0].x - (layout.viewport.width * layout.viewport.padding.left / 100);
      _overviewTop = frames[0].y - (layout.viewport.height * layout.viewport.padding.top / 100);

      var state = viewerState.getState();
      viewBounds = new OpenSeadragon.Rect(_overviewLeft, _overviewTop + renderState.getState().lastScrollPosition,
        state.width, state.height);

      renderState.setState({zooming: true});
      disableZoomAndPan();
      setScrollElementEvents();
      viewer.viewport.fitBounds(viewBounds, !animateViewport);

      setTimeout(function(){
        renderState.setState({zooming: false});
        setScrollElementEvents();
      }, 1200);
    }
  }

  function setCanvasObjects(state) {
    _canvasObjects = state;
  }

  function setScrollElementEvents() {
    var animationTiming = 1200;
    var interactionOverlay = d3.select(overlays[0]);
    var state = viewerState.getState();
    if (state.perspective === 'detail') {
      interactionOverlay
        .style('opacity', 0)
        .style('pointer-events', 'none');

      d3.select(scrollContainer[0])
        .style('pointer-events', 'none')
        .style('overflow-y', 'hidden');

    } else if(! renderState.getState().zooming) {
      interactionOverlay
        .style('pointer-events', 'all')
        .transition()
        .duration(animationTiming/2)
        .style('opacity', 1);

      d3.select(scrollContainer[0])
        .style('pointer-events', 'all')
        .style('overflow-y', 'scroll');
    }
  }

  function disableZoomAndPan() {
    viewer.zoomPerClick = 1;
    viewer.zoomPerScroll = 1;
    viewer.panHorizontal = false;
    viewer.panVertical = false;
  }

  function enableZoomAndPan() {
    viewer.zoomPerClick = 2;
    viewer.zoomPerScroll = 1.2;
    viewer.panHorizontal = true;
    viewer.panVertical = true;
  }

  function renderLayout(layoutData, animate, callback) {
    // To understand this render function,
    // you need a general understanding of d3 selections,
    // and you will want to read about nested
    // selections in particular: http://bost.ocks.org/mike/nest/

    var interactionOverlay = d3.select(overlays[0]),
        animationTiming = animate ? 1000 : 0;

    var frame = interactionOverlay.selectAll('.' + frameClass)
          .data(layoutData);

    var frameUpdated = frame
          .style('width', function(d) { return d.width + 'px'; })
          .style('height', function(d) { return d.height + 'px'; })
          .transition()
          .duration(animationTiming)
          .ease('cubic-out')
          .styleTween('transform', function(d) {
            return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
          })
          .styleTween('-webkit-transform', function(d) {
            return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
          })
          .tween('translateTilesources', translateTilesources)
          .call(endall, function() {
            if (callback) { callback();}
          });

    frame.select('.' + canvasClass)
      .style('width', function(d) { return d.canvas.width + 'px'; })
      .style('height', function(d) { return d.canvas.height + 'px'; })
      .attr('class', function(d) {
        var selected = d.canvas.selected;
        return selected ? canvasClass + ' selected' : canvasClass;
      })
      .transition()
      .duration(animationTiming)
      .ease('cubic-out')
      .styleTween('transform', function(d) {
        return d3.interpolateString(this.style.transform, 'translate(' + d.canvas.localX +'px,' + d.canvas.localY + 'px)');
      })
      .styleTween('-webkit-transform', function(d) {
        return d3.interpolateString(this.style.transform, 'translate(' + d.canvas.localX +'px,' + d.canvas.localY + 'px)');
      });

    var frameEnter = frame
          .enter().append('div')
          .attr('class', frameClass)
          .style('width', function(d) { return d.width + 'px'; })
          .style('height', function(d) { return d.height + 'px'; })
          .style('transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; })
          .style('-webkit-transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; });

    frameEnter
      .append('div')
      .attr('class', function(d) {
        var selected = d.canvas.selected;
        return selected ? canvasClass + ' selected' : canvasClass;
      })
      .attr('data-id', function(d) {
        return d.canvas.id;
      })
      .style('width', function(d) { return d.canvas.width + 'px'; })
      .style('height', function(d) { return d.canvas.height + 'px'; })
      .style('transform', function(d) { return 'translateX(' + d.canvas.localX + 'px) translateY(' + d.canvas.localY + 'px)'; })
      .style('-webkit-transform', function(d) { return 'translateX(' + d.canvas.localX + 'px) translateY(' + d.canvas.localY + 'px)'; })
      .each(enterImages);
    // .append('img')
    // .attr('src', function(d) { return d.canvas.iiifService + '/full/' + Math.ceil(d.canvas.width * 2) + ',/0/default.jpg';});

    frameEnter
      .append('div')
      .attr('class', labelClass)
      .text(function(d) { return d.canvas.label; });

  }

  function endall(transition, callback) {
    var n = 0;
    if (transition.empty()) {callback();} else {
      transition
        .each(function() { ++n; })
        .each("end", function() { if (!--n) callback.apply(this, arguments); });
    }
  }

  function translateTilesources(d, i) {
    var canvas = _canvasObjects[d.canvas.id];
    var currentBounds = canvas.getBounds();

    var xi = d3.interpolate(currentBounds.x, d.canvas.x);
    var yi = d3.interpolate(currentBounds.y, d.canvas.y);

    return function(t) {
      canvas.setBounds(xi(t), yi(t), d.canvas.width, d.canvas.height);
    };
  }

  function updateImages(d) {
    var canvasData = d.canvas,
        canvasImageState = _canvasObjects[canvasData.id];
  }

  function enterImages(d) {
    var canvasData = d.canvas,
        canvasImageState = _canvasObjects[canvasData.id];

    canvasImageState.setBounds(canvasData.x, canvasData.y, canvasData.width, canvasData.height);
    canvasImageState.openThumbnail();
  }

  function removeImages(d) {
  }

  function initOSD() {
    viewer = OpenSeadragon({
      element: osdContainer[0],
      showNavigationControl: false,
      preserveViewport: true
    });

    // Open the main tile source when we reach the specified zoom level on it
    var _semanticZoom = function(zoom, center) {
      if(zoom >= _transitionZoomLevel) {
        for(var key in _canvasObjects) {
          if(_canvasObjects[key].containsPoint(center)) {
            _canvasObjects[key].openMainTileSource();
          }
        }
      }
    };

    viewer.addHandler('animation', function(event) {
        synchroniseZoom();
    });

    viewer.addHandler('zoom', function(event) {
      if (viewerState.getState().perspective === 'detail') {
        applyConstraints();
      }
      var center = viewer.viewport.getBounds().getCenter();
      _semanticZoom(event.zoom, center);
    });

    viewer.addHandler('pan', function(event) {
      if (viewerState.getState().perspective === 'detail') {
        applyConstraints();
      }
      var zoom = viewer.viewport.getZoom();
      _semanticZoom(zoom, event.center);
    });

    viewer.addHandler('canvas-click', function(event) {
      var hitCanvases = [];
      var clickPosition = viewer.viewport.pointFromPixel(event.position);
      for(var key in _canvasObjects) {
        if(_canvasObjects[key].containsPoint(clickPosition)){
          hitCanvases.push(_canvasObjects[key]);
        }
      }
      if(event.quick && hitCanvases[0]) {
        var bounds = hitCanvases[0].getBounds();
        viewer.viewport.fitBounds(bounds);
        hitCanvases[0].openMainTileSource();
      }
    });
  }

  function synchroniseZoom() {
    var viewerWidth = viewer.container.clientWidth;
    var viewerHeight = viewer.container.clientHeight;
    var center = viewer.viewport.getCenter(true);
    var p = center.minus(new OpenSeadragon.Point(viewerWidth / 2, viewerHeight / 2))
          .minus(new OpenSeadragon.Point(0, renderState.getState().lastScrollPosition));
    var zoom = viewer.viewport.getZoom(true);
    var scale = viewerWidth * zoom;

    var transform = 'scale(' + scale + ') translate(' + -p.x + 'px,' + -p.y + 'px)';

    d3.select(overlays[0])
      .style('transform', transform)
      .style('-webkit-transform', transform);
  }

  function synchronisePan(width, height) {
    var viewBounds = new OpenSeadragon.Rect(_overviewLeft, _overviewTop + renderState.getState().lastScrollPosition, width, height);
    viewer.viewport.fitBounds(viewBounds, true);
  }

  function applyConstraints() {
    var state = renderState.getState();
    var constraintBounds = new OpenSeadragon.Rect(
      state.constraintBounds.x,
      state.constraintBounds.y,
      state.constraintBounds.width,
      state.constraintBounds.height
    );

    if (constraintBounds && !state.inZoomConstraints) {
      var changed = false;
      var currentBounds = viewer.viewport.getBounds();

      if (currentBounds.x < constraintBounds.x - 0.00001) {
        currentBounds.x = constraintBounds.x;
        changed = true;
      }

      if (currentBounds.y < constraintBounds.y - 0.00001) {
        currentBounds.y = constraintBounds.y;
        changed = true;
      }

      if (currentBounds.width > constraintBounds.width + 0.00001) {
        currentBounds.width = constraintBounds.width;
        changed = true;
      }

      if (currentBounds.height > constraintBounds.height + 0.00001) {
        currentBounds.height = constraintBounds.height;
        changed = true;
      }

      if (currentBounds.x + currentBounds.width > constraintBounds.x + constraintBounds.width + 0.00001) {
        currentBounds.x = (constraintBounds.x + constraintBounds.width) - currentBounds.width;
        changed = true;
      }

      if (currentBounds.y + currentBounds.height > constraintBounds.y + constraintBounds.height + 0.00001) {
        currentBounds.y = (constraintBounds.y + constraintBounds.height) - currentBounds.height;
        changed = true;
      }

      if (changed) {
        renderState.setState({ inZoomConstraints: true });
        viewer.viewport.fitBounds(currentBounds);
        renderState.setState({ inZoomConstraints: false });
      }
    }

    // var zoom = viewer.viewport.getZoom();
    // var maxZoom = 2;

    // var zoomPoint = viewer.viewport.zoomPoint || viewer.viewport.getCenter();
    // var info = this.hitTest(zoomPoint);
    // if (info) {
      // var page = this.pages[info.index];
      // var tiledImage = page.hitTest(zoomPoint);
      // if (tiledImage) {
      //   maxZoom = this.viewer.maxZoomLevel;
      //   if (!maxZoom) {
      //     var imageWidth = tiledImage.getContentSize().x;
      //     var viewerWidth = this.$el.width();
      //     maxZoom = imageWidth * this.viewer.maxZoomPixelRatio / viewerWidth;
      //     maxZoom /= tiledImage.getBounds().width;
      //   }
      // }
    // }

    // if (zoom > maxZoom) {
    //   this.viewer.viewport.zoomSpring.target.value = maxZoom;
    // }
  }

  function selectCanvas(item) {
    _canvasObjects[item].openMainTileSource();
    viewerState.setState({
      selectedCanvas: item,
      perspective: 'detail'
    });
    _dispatcher.emit('canvas-selected', { detail: _canvasObjects[item] });
  }

  function getSelectedCanvas() {
    var state = viewerState.getState();
    return _canvasObjects[state.selectedCanvas];
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
    var canvases = _canvasObjects;

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

    setCanvasObjects(canvasObjects);
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
    _canvasObjects[canvasId].openMainTileSource();
  }

  function _selectCanvasForIndex(index) {
    var canvasId = canvases[index]['@id'];
    selectCanvas(canvasId);
  }

  var getCanvasByIndex = function(index) {
    var canvasId = canvases[index]['@id'];
    return _canvasObjects[canvasId];
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
    var currentCanvasIndex = _canvasObjects[state.selectedCanvas].index;
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

    overlays.remove();
    scrollContainer.remove();
    osdContainer.remove();
    container.off('click', canvasClickHandler);

    viewerState = null;
    renderState = null;
    _canvasObjects = null;

    _destroyed = true; // cancels the timer
  }

  function canvasClickHandler(event) {
    selectCanvas($(this).data('id'));
  }

  function scrollHandler(event) {
    var currentState = viewerState.getState();
    if (currentState.perspective === 'overview' && renderState.getState().zooming === false) {
      var width = currentState.width;
      var height = currentState.height;
      renderState.setState({ lastScrollPosition: $(this).scrollTop() });
      synchronisePan(width, height);
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
