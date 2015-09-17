'use strict';

var d3 = require('./lib/d3-slim-dist');
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
      _inZoomConstraints,
      _lastScrollPosition = 0;

  function getViewingDirection() {
    if (sequence && sequence.viewingDirection) {
      return sequence.viewingDirection;
    }
    return manifest.viewingDirection ? manifest.viewingDirection : 'left-to-right';
  };

  function getViewingHint() {
    if (sequence && sequence.viewingHint) {
      return sequence.viewingHint;
    }
    return manifest.viewingHint ? manifest.viewingHint : 'individuals';
  };

  buildCanvasStates(canvases);

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
     'overflow': 'hidden'//,
     // 'overflow-x': 'hidden',
     // 'overflow-y': 'scroll'
    });

  container.append(osdContainer);
  container.append(scrollContainer);
  scrollContainer.append(overlays);
  initOSD();

  // set the initial state, which triggers the first rendering.
  canvasState({
    selectedCanvas: selectedCanvas, // @id of the canvas:
    perspective: initialPerspective, // can be 'overview' or 'detail'
    viewingMode: initialViewingMode, // manifest derived or user specified (iiif viewingHint)
    viewingDirection: initialViewingDirection, // manifest derived or user specified (iiif viewingHint)
    width: container.width(),
    height: container.height()
  }, true); // "initial" is true here; don't fire the state callback.

  d3.timer(function() {
    viewer.forceRedraw();
  });

  function canvasState(state, initial) {

    if (!arguments.length) return _canvasState;
    _canvasState = state;

    if (stateUpdateCallback && !initial) {
      // should we pass in the state here?
      // I don't really want to encourage reading
      // the state from the event.
      stateUpdateCallback();
    }
    render();

    return _canvasState;
  }

  function render() {
    var userState = canvasState();

    // Layout is configured from current user state. The
    // layout algorithm, viewing hints, animations (such as
    // initial layout without animation) are all
    // functions of the current user state.
    var layout = manifestLayout({
      canvases: canvases,
      width: userState.width,
      height: userState.height,
      scaleFactor: userState.scaleFactor,
      viewingDirection: userState.viewingd,
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
      containerPadding: {
        top: 50,
        bottom: 130,
        left: 200,
        right: 10
      },
      minimumImageGap: 5, // precent of viewport
      facingCanvasPadding: 1 // precent of viewport
    });

    if (userState.perspective === 'detail' && userState.previousPerspective === 'overview') {
      var endCallback = function() {
          renderLayout(layout.intermediate(), false);
      };
      renderLayout(layout.intermediate(), true, endCallback);
    } else if (userState.perspective === 'overview' && userState.previousPerspective === 'detail') {
        endCallback = function() {
        renderLayout(layout.overview(), true);
      };
      renderLayout(layout.intermediate(), false, endCallback);
    } else if (userState.perspective === 'detail' && userState.previousPerspective === 'detail') {
      renderLayout(layout.intermediate(), false);
    } else {
      renderLayout(layout.overview(), true);
    }

    if (userState.perspective === 'detail') {
      var viewBounds = layout.intermediate().filter(function(frame) {
        return frame.canvas.selected;
      })[0].vantage;

      updateConstraintBounds(viewBounds);
      var osdBounds = new OpenSeadragon.Rect(viewBounds.x, viewBounds.y, viewBounds.width, viewBounds.height);
      setScrollElementEvents();
      if (userState.previousPerspective) {
        console.log(userState.previousPerspective);
        viewer.viewport.fitBounds(osdBounds, false);
      } else {
        console.log(userState.previousPerspective);
        viewer.viewport.fitBounds(osdBounds, true);
      }
    } else {
      viewBounds = new OpenSeadragon.Rect(0, _lastScrollPosition, canvasState().width, canvasState().height);
      _zooming = true;
      setScrollElementEvents();

      if (userState.previousPerspective) {
        console.log(userState.previousPerspective);
        viewer.viewport.fitBounds(viewBounds, false);
      } else {
        console.log(userState.previousPerspective);
        viewer.viewport.fitBounds(viewBounds, true);
      }

      setTimeout(function(){
        _zooming = false;
        setScrollElementEvents();
      }, 1200);
    }
  }

  function canvasImageStates(state) {

    if (!arguments.length) return _canvasImageStates;
    _canvasImageStates = state;

    // if (!initial) {
    //     jQuery.publish('annotationsTabStateUpdated' + this.windowId, this.tabState);
    // }

    return _canvasImageStates;
  }

  // function detailTransition(detailLayout) {
  //     renderLayout(detailLayout);
  // }
  // function overviewTransition(selection) {
  //     renderLayout(detailLayout);
  // }
  function setScrollElementEvents() {
    var animationTiming = 1200;
    var interactionOverlay = d3.select(overlays[0]);
    if (canvasState().perspective === 'detail') {
      interactionOverlay
        .style('opacity', 0)
        .transition()
        .duration(animationTiming)
        .style('pointer-events', 'none');

      d3.select(scrollContainer[0])
        .transition()
        .duration(animationTiming)
        .style('pointer-events', 'none')
        .style('overflow-x', 'hidden')
        .style('overflow-y', 'hidden');
    } else if(!_zooming) {

      interactionOverlay
        .style('opacity', 1)
        .transition()
        .duration(animationTiming)
        .style('pointer-events', 'all');

      d3.select(scrollContainer[0])
        .transition()
        .duration(animationTiming)
        .style('pointer-events', 'all')
        .style('overflow-x', 'hidden')
        .style('overflow-y', 'scroll');
    }
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

  };

  function endall(transition, callback) {
    var n = 0;
    if (transition.empty()) {callback();} else {
      transition
        .each(function() { ++n; })
        .each("end", function() { if (!--n) callback.apply(this, arguments); });
    }
  }

  function translateTilesources(d, i) {
    var canvasId = d.canvas.id,
        dummyObj = canvasImageStates()[canvasId].dummyObj,
        mainImageObj = canvasImageStates()[canvasId].mainImageObj;

    var currentBounds = mainImageObj ? mainImageObj.getBounds(true) : dummyObj.getBounds(true),
        xi = d3.interpolate(currentBounds.x, d.canvas.x),
        yi = d3.interpolate(currentBounds.y, d.canvas.y);

    return function(t) {
        mainImageObj.setPosition(new OpenSeadragon.Point(xi(t), yi(t)), true);
        mainImageObj.setWidth(d.canvas.width, true);
        mainImageObj.setHeight(d.canvas.height, true);
    };
  }

  function updateImages(d) {
    var canvasData = d.canvas,
        canvasImageState = canvasImageStates()[canvasData.id];
  }

  function enterImages(d) {

    var canvasData = d.canvas,
        canvasImageState = canvasImageStates()[canvasData.id];

      viewer.addTiledImage({
        x: canvasData.x,
        y: canvasData.y,
        width: canvasData.width,
        tileSource: canvasImageState.tileSourceUrl,
        index: 0, // Add the new image below the stand-in.
        success: function(event) {
          addMainImageObj(canvasData.id, event.item);
          var main = event.item;
          var tileDrawnHandler = function(event) {
              viewer.removeHandler('tile-drawn', tileDrawnHandler);
              main.setOpacity(0,true);
              fade(main, 1);
          };

          viewer.addHandler('tile-drawn', tileDrawnHandler);
        }
      });
  }

  function fade(image, targetOpacity, callback) {
    var currentOpacity = image.getOpacity();
    var step = (targetOpacity - currentOpacity) / 30;
    if (step === 0) {
      callback();
      return;
    }

    var frame = function() {
      currentOpacity += step;
      if ((step > 0 && currentOpacity >= targetOpacity) || (step < 0 && currentOpacity <= targetOpacity)) {
        image.setOpacity(targetOpacity);
        if (callback) callback();
        return;
      }

      image.setOpacity(currentOpacity);
      OpenSeadragon.requestAnimationFrame(frame);
    };
    OpenSeadragon.requestAnimationFrame(frame);
  };

  function removeImages(d) {
  }

  function initOSD() {
    viewer = OpenSeadragon({
      element: osdContainer[0],
      showNavigationControl: false,
      preserveViewport: true
    });

    viewer.addHandler('animation', function(event) {
      if (canvasState().perspective === 'detail' || _zooming === true) {
        synchroniseZoom();
      }
    });

    viewer.addHandler('zoom', function(event) {
      if (canvasState().perspective === 'detail') {
        applyConstraints(_constraintBounds);
      }
    });

    viewer.addHandler('pan', function(event) {
      if (canvasState().perspective === 'detail') {
        applyConstraints(_constraintBounds);
      }
    });
  };

  function synchroniseZoom() {
    var viewerWidth = viewer.container.clientWidth;
    var viewerHeight = viewer.container.clientHeight;
    var center = viewer.viewport.getCenter(true);
    var p = center.minus(new OpenSeadragon.Point(viewerWidth / 2, viewerHeight / 2))
          .minus(new OpenSeadragon.Point(0, _lastScrollPosition));
    var zoom = viewer.viewport.getZoom(true);
    var scale = viewerWidth * zoom;

    var transform = 'scale(' + scale + ') translate(' + -p.x + 'px,' + -p.y + 'px)';

    d3.select(overlays[0])
      .style('transform', transform)
      .style('-webkit-transform', transform);
  }

  function synchronisePan(panTop, width, height) {
    var x = width/2;
    var y = panTop + height/2;
    viewer.viewport.panTo(new OpenSeadragon.Point(x,y), true);
  }

  function applyConstraints(constraintBounds) {
    constraintBounds = new OpenSeadragon.Rect(
      constraintBounds.x,
      constraintBounds.y,
      constraintBounds.width,
      constraintBounds.height
    );

    if (constraintBounds && !_inZoomConstraints) {
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
        _inZoomConstraints = true;
        viewer.viewport.fitBounds(currentBounds);
        _inZoomConstraints = false;
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
    var state = canvasState();
    state.selectedCanvas = item;
    state.previousPerspective = state.perspective;
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

  function addMainImageObj(id, osdTileObj) {
    var canvasStates = canvasImageStates();
    console.log('added main image');

    canvasStates[id].mainImageObj = osdTileObj;

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

  container.on('click', '.' + canvasClass, function(event) {
    selectCanvas($(this).data('id'));
  });
  scrollContainer.on('scroll', function(event) {
    if (canvasState().perspective === 'overview' && _zooming === false) {
      _lastScrollPosition = $(this).scrollTop();
      synchronisePan(_lastScrollPosition, $(this).width(), $(this).height());
    }
  });

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
