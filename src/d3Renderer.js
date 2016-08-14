var d3 = require('./lib/d3-slim-dist'),
manifestLayout = require('./manifestLayout.js');

var d3Renderer = function(config) {
  var dispatcher = config.dispatcher,
      renderState = config.renderState,
      viewerState = config.viewerState,
      scrollContainer = config.scrollContainer,
      container = config.container,
      canvasClass = config.canvasClass,
      frameClass = config.frameClass,
      labelClass = config.labelClass;

  // dispatcher.on('immediateUpdate', immediateLayout);
  // dispatcher.on('scrollOverview', scrollOverview);
  // dispatcher.on('transitionToOverview', transitionToOverview);
  // dispatcher.on('transitionToDetail', transitionToDetail;
  // dispatcher.on('selectCanvas', selectCanvas);
  // dispatcher.on('changeViewingMode', changeViewingMode);
  // dispatcher.on('changeViewingDirection', changeViewingMode);
  // dispatcher.on('translateZoom', setZoomRegion);
  immediateUpdate();

  function setScrollElementEvents() {
    if(! viewerState) {
      return;
    }
    var animationTiming = 1200;
    var interactionOverlay = d3.select(container);
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

  function setZoomRegion(scale, point) {
    var transform = 'scale(' + scale + ') translate(' + -point.x + 'px,' + -point.y + 'px)';

    d3.select(overlayContainer)
      .style('transform', transform)
      .style('-webkit-transform', transform);
  }

  function immediateUpdate() {
    // One-step layout of all canvases in the
    // current viewingMode, viewingDirection and perspective.
    renderLayout(calculateLayout(viewerState.getState().perspective)({x:300, y:20}),false);
  }
  function scrollOverview() {
  }
  function transitionToOverview() {
    self.renderLayout(self.calculateLayout(self.viewerState.getState().perspective)({x:300, y:20}),false);
  }
  function transitionToDetail() {
    renderLayout(calculateLayout(),false);
  }
  function selectCanvas() {
    renderLayout(calculateLayout(),false);
  }
  function changeViewingMode() {
    renderLayout(calculateLayout(),false);
  }
  function changeViewingDirection() {
    renderLayout(calculateLayout(),false);
  }

  function calculateLayout(layoutType) {
    var userState = viewerState.getState();

    return manifestLayout({
      canvases: userState.canvases,
      width: userState.width,
      height: userState.height,
      scaleFactor: userState.scaleFactor,
      viewingDirection: userState.viewingDirection,
      viewingMode: userState.viewingMode,
      canvasHeight: 200,
      canvasWidth: 500,
      selectedCanvas: userState.selectedCanvas,
      framePadding: {
        top: 10,
        bottom: 40,
        left: 10,
        right: 10
      },
      viewportPadding: userState.viewportPadding,
      minimumImageGap: 5, // precent of viewport
      facingCanvasPadding: 0.1 // precent of viewport
    })[layoutType];
  }

  function renderLayout(layoutData, animate, callback) {
    // To understand this render function,
    // you need a general understanding of d3 selections,
    // and you will want to read about nested
    // selections in particular: http://bost.ocks.org/mike/nest/

    var localViewerState = viewerState;
    var main = d3.select(container)
          .selectAll('.main')
          .data([true])
          .enter()
          .append('div')
          .attr('class', 'manifest-layouts-DOM-container')
          .style({
               width: '100%',
               height: '100%',
               position: 'absolute',
               top: 0,
               left: 0
          });

    var scrollContainer = main
          .append('div')
          .attr('class', 'manifest-scroll-container')
          .style({
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            'overflow': 'hidden',
            'overflow-x': 'hidden'
          });

    var animationTiming = animate ? 1000 : 0;
    var frame = main.selectAll('.' + frameClass).data(layoutData);

    var getWidthInPx = function(d) {
      return d.width + 'px';
    };
    var getHeightInPx = function(d) {
      return d.height + 'px';
    };

    var getCanvasWidthInPx = function(d) {
      return d.canvas.width + 'px';
    };
    var getCanvasHeightInPx = function(d) {
      return d.canvas.height + 'px';
    };

    var getTransformStyle = function(d) {
      return d3.interpolateString(
        this.style.transform,
        'translate(' + d.x +'px,' + d.y + 'px)'
      );
    };

    var getSelectTransformStyle = function(d) {
      return d3.interpolateString(
        this.style.transform,
        'translate(' + d.canvas.localX +'px,' + d.canvas.localY + 'px)'
      );
    };

   var getEnterTransformStyle = function(d) {
      return 'translate(' + d.x + 'px,' + d.y + 'px)';
    };

    var getEnterTranslate = function(d) {
      return 'translateX(' + d.canvas.localX + 'px) translateY(' + d.canvas.localY + 'px)';
    };

    var getClass = function(d) {
      var selected = d.canvas.selected;
      return selected ? canvasClass + ' selected' : canvasClass;
    };

    // Update Existing Frame Elements
    frame
      .style('width', getWidthInPx)
      .style('height', getHeightInPx)
      .transition()
      .duration(animationTiming)
      .ease('cubic-out')
      .styleTween('transform', getTransformStyle)
      .styleTween('-webkit-transform', getTransformStyle)
      .tween(
        'translateTilesources',
        function(d, i) {
          var canvas = viewerState.getState().canvasObjects[d.canvas.id];
          var currentBounds = canvas.getBounds();

          var xi = d3.interpolate(currentBounds.x, d.canvas.x);
          var yi = d3.interpolate(currentBounds.y, d.canvas.y);

          return function(t) {
            // Set the intermediate state of the canvas's
            // parameters for each frame of the transition animation
            canvas.setBounds(xi(t), yi(t), d.canvas.width, d.canvas.height);
          };
        }
      )
      .call(
        endall,
        callback
      );

    // Update Existing Canvas Elements
    frame.select('.' + canvasClass)
      .style('width', getCanvasWidthInPx)
      .style('height', getCanvasHeightInPx)
      .attr('class', getClass)
      .transition()
      .duration(animationTiming)
      .ease('cubic-out')
      .styleTween('transform', getSelectTransformStyle)
      .styleTween('-webkit-transform', getSelectTransformStyle);

    var frameEnter = frame.enter()
      .append('div')
      .attr('class', frameClass)
      .style('width', getWidthInPx)
      .style('height', getHeightInPx)
      .style('transform', getEnterTransformStyle)
      .style('-webkit-transform', getEnterTransformStyle);

    frameEnter.append('div')
      .attr('class', getClass)
      .attr('data-id', function(d) {
        return d.canvas.id;
      })
      .style('width', getCanvasWidthInPx)
      .style('height', getCanvasHeightInPx)
      .style('transform', getEnterTranslate)
      .style('-webkit-transform', getEnterTranslate)
      .each(function(d) {
        var canvasData = d.canvas,
            canvasImageState = viewerState.getState().canvasObjects[canvasData.id];

        // canvasImageState.setBounds(canvasData.x, canvasData.y, canvasData.width, canvasData.height);
      });

    frameEnter.append('div')
      .attr('class', labelClass)
      .text(function(d) { return d.canvas.label; });
  }

  function endall(transition, callback) {
    var n = 0;
    if (transition.empty()) {
      if (callback) callback();
    } else {
      transition
        .each(function() { ++n; })
        .each("end", function() { if (!--n) {
          if (callback) callback.apply(this, arguments);
        }});
    }
  }
};

module.exports = d3Renderer;
