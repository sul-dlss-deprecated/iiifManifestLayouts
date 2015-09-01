'use strict';

var d3 = require('./lib/d3-slim-dist');
var manifestLayout = require('./manifestLayout');
var canvasLayout = require('./canvasLayout');
var iiif = require('./iiifUtils');

var imageRenderer = function(options) {
  var container = options.container,
      viewer;

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

  d3.timer(function() {
    viewer.forceRedraw();
  });

  function initOSD() {
    viewer = OpenSeadragon({
      element: osdContainer[0],
      autoResize: true,
      showNavigationControl: false,
      preserveViewport: true
    });

    $(viewer.container).css('position', 'absolute');

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
  }

  function synchroniseZoom() {
    var viewerWidth = viewer.container.clientWidth;
    var viewerHeight = viewer.container.clientHeight;
    var center = viewer.viewport.getCenter(true);
    var p = center.minus(new OpenSeadragon.Point(viewerWidth / 2, viewerHeight / 2));
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

    // if (userState.perspective === 'detail' && userState.previousPerspective === 'overview') {
    //     var endCallback = function() {console.log('rendered overview from detail'); renderLayout(layout.overview(), true);};
    //     renderLayout(layout.intermediate(), false, endCallback);
    // } else if (userState.perspective === 'overview' && userState.preserveViewport === 'detail'){
    //     endCallback = function() {console.log('rendered overview from detail'); renderLayout(layout.detail(), false);};
    //     renderLayout(targetLayout, true, endCallback);
    // } else {
    //     renderLayout(targetLayout, true);
    // }

    if (userState.perspective === 'detail' && userState.previousPerspective === 'overview') {
      var endCallback = function() {
          renderLayout(layout.overview(), false);
      };
      renderLayout(layout.intermediate(), true, endCallback);
    } else if (userState.perspective === 'overview' && userState.previousPerspective === 'detail'){
        endCallback = function() {
        renderLayout(layout.overview(), false);
      };
      renderLayout(layout.intermediate(), false, endCallback);
    } else if (userState.perspective === 'detail' && userState.perspective === 'detail'){
      renderLayout(layout.intermediate(), false);
    } else {
      renderLayout(layout.overview(), true);
    }

    // renderLayout(layout.intermediate(), true);

    // calculate and zoom to new bounds (if relevant)
    // Set appropriate events for mode.

    if (userState.perspective === 'detail') {
      var viewBounds = layout.intermediate().filter(function(frame) {
        return frame.canvas.selected;
      })[0].vantage;
      updateConstraintBounds(viewBounds);

      var osdBounds = new OpenSeadragon.Rect(viewBounds.x, viewBounds.y, viewBounds.width, viewBounds.height);

      setScrollElementEvents();
      viewer.viewport.fitBounds(osdBounds, false);
    } else {
      viewBounds = new OpenSeadragon.Rect(0,0, canvasState().width, canvasState().height);
      _zooming = true;
      setScrollElementEvents();
      viewer.viewport.fitBounds(viewBounds, false);
      setTimeout(function(){
        _zooming = false;
        setScrollElementEvents();
      }, 1200);
    }
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
    var canvasId = d.canvas.id,
        dummyObj = canvasImageStates()[canvasId].dummyObj;

    var currentBounds = dummyObj.getBounds(true),
        xi = d3.interpolate(currentBounds.x, d.canvas.x),
        yi = d3.interpolate(currentBounds.y, d.canvas.y);

    return function(t) {
      dummyObj.setPosition(new OpenSeadragon.Point(xi(t), yi(t)), true);
      dummyObj.setWidth(d.canvas.width, true);
      dummyObj.setHeight(d.canvas.height, true);
    };
  }

  function updateImages(d) {
    var canvasData = d.canvas,
        canvasImageState = canvasImageStates()[canvasData.id];

    if (canvasState().perspective === 'detail' && canvasState().selectedCanvas === canvasData.id) {
      substitute(canvasData, canvasImageState.dummyObj, canvasImageState.tileSourceUrl);
    }
  }

  function substitute(canvasData, dummyObj, tileSourceUrl) {
    viewer.addTiledImage({
      x: canvasData.x,
      y: canvasData.y,
      width: canvasData.width,
      tileSource: tileSourceUrl,
      index: 0, // Add the new image below the stand-in.
      success: function(event) {
        var fullImage = event.item;

        // The changeover will look better if we wait for the first tile to be drawn.
        var tileDrawnHandler = function(event) {
          if (event.tiledImage === fullImage) {
            viewer.removeHandler('tile-drawn', tileDrawnHandler);
            fade(dummyObj, 0, function() { viewer.world.removeItem(dummyObj); });
          }
        };

        viewer.addHandler('tile-drawn', tileDrawnHandler);
      }
    });
  }

  function enterImages(d) {

    var canvasData = d.canvas,
        canvasImageState = canvasImageStates()[canvasData.id];

    var dummy = {
      type: 'legacy-image-pyramid',
      levels: [
        {
          url: canvasData.thumbService + '/full/' + Math.ceil(d.canvas.width * 2) + ',/0/default.jpg',
          width: canvasData.width,
          height: canvasData.height
        }
      ]
    };

    viewer.addTiledImage({
      tileSource: dummy,
      x: canvasData.x,
      y: canvasData.y,
      width: canvasData.width,
      success: function(event) {
        addDummyObj(canvasData.id, event.item);
      }
    });

    if (canvasState().perspective === 'detail' && canvasState().selectedCanvas === canvasData.id) {
      substitute(canvasData, canvasImageState.dummyObj, canvasImageState.tileSourceUrl);
    }
  }

  function fade(image, targetOpacity, callback) {
    var currentOpacity = image.getOpacity();
    var step = (targetOpacity - currentOpacity) / 10;
    if (step === 0) {
      callback();
      return;
    }

    var frame = function() {
      currentOpacity += step;
      if ((step > 0 && currentOpacity >= targetOpacity) || (step < 0 && currentOpacity <= targetOpacity)) {
        image.setOpacity(targetOpacity);
        callback();
        return;
      }

      image.setOpacity(currentOpacity);
      OpenSeadragon.requestAnimationFrame(frame);
    };
    OpenSeadragon.requestAnimationFrame(frame);
  };

  function removeImages(d) {
  }

};

module.exports = imageRenderer;
