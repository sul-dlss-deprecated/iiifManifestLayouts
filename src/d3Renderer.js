var d3 = require('./lib/d3-slim-dist'),
    manifestLayout = require('iiif-layout-functions');

var d3Renderer = function(config) {
  var dispatcher = config.dispatcher,
      renderState = config.renderState,
      viewerState = config.viewerState,
      container = config.container,
      scrollContainer,
      canvasClass = config.canvasClass,
      frameClass = config.frameClass,
      labelClass = config.labelClass;

  buildContainers();
  immediateUpdate();

  dispatcher.on('currentZoomUpdated', setZoomRegion);
  dispatcher.on('perspectiveUpdated', changePerspective);
  // dispatcher.on('selectCanvas', selectCanvas);
  dispatcher.on('viewingModeUpdated', changeViewingMode);
  // dispatcher.on('changeViewingDirection', changeViewingMode);
  dispatcher.on('scaleFactorUpdated', immediateUpdate);
  dispatcher.on('image-status-updated', updateThumb);

  function buildContainers() {
    scrollContainer = d3.select(container).selectAll('.manifest-scroll-container')
      .data([true]);

    scrollContainer.enter()
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

    scrollContainer.on('scroll', function(event) {
      renderState.overviewScrollPosition(this.scrollTop);
    });

    container = scrollContainer.selectAll('.manifest-layouts-DOM-container')
      .data([true]);

    container.enter()
      .append('div')
      .attr('class', 'manifest-layouts-DOM-container')
      .style({
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      });

  }
  enableOverviewScrollEvents();

  function disableScrollEvents() {
    var state = viewerState.getState();
    container
      .style('pointer-events', 'none');

    scrollContainer
      .style('pointer-events', 'none')
      .style('overflow-y', 'hidden');
  }

  function enableOverviewScrollEvents() {
    container
      .style('pointer-events', 'all');

    scrollContainer
      .style('pointer-events', 'all')
      .style('overflow-y', 'scroll');
  }

  function enableDetailContinuousScrollEvents(viewingDirection) {
    scrollContainer
      .style('pointer-events', 'all');

    if (viewingDirection === 'right-to-left' || viewingDirection === 'left-to-right') {
      scrollContainer
        .style('overflow-x', 'scroll')
        .style('overflow-y', 'hidden');
      return;
    } else {
      scrollContainer
        .style('overflow-x', 'hidden')
        .style('overflow-y', 'scroll');
      return;
    }
  }
  function setZoomRegion() {
    var scale = renderState.getState().currentZoom.scale;
    var center = renderState.getState().currentZoom.center;
    var transform = 'scale(' + scale + ') translate(' + -center.x + 'px,' + -center.y + 'px)';

    container
      .style('transform', transform)
      .style('-webkit-transform', transform);
  }
  function immediateUpdate() {
    // One-step layout of all canvases in the
    // current viewingMode, viewingDirection and perspective.
    var layout = calculateLayout(viewerState.getState().perspective)(),
    viewBounds = layout.filter(function(frame) {
      return frame.canvas.selected;
    })[0].vantage;

    renderState.constraintBounds(viewBounds, false);
    if (viewerState.getState().perspective === 'detail') {
      disableScrollEvents();
      scrollContainer
        .style('opacity', 0);
    } else {
      scrollContainer
        .style('opacity', 1);
      enableOverviewScrollEvents();
    }
    renderLayout(layout, false);
  }
  function changePerspective() {
    if (viewerState.getState().perspective === 'detail') {
      transitionToDetail();
      return;
    }
    transitionToOverview();
  }
  function scrollOverview() {
  }
  function transitionToOverview() {
    var stage1layout = calculateLayout('intermediate')(),
        stage2layout = calculateLayout('overview')(),
        stage2viewBounds = stage2layout.filter(function(frame) {
          return frame.canvas.selected;
        })[0].vantage;

    renderState.constraintBounds(stage2viewBounds, true);
    container
      .transition()
      .style('opacity', 1);

    renderLayout(stage1layout, false, function() {
      renderLayout(stage2layout, true);
      renderState.constraintBounds(stage2viewBounds, true);
      enableOverviewScrollEvents();
    });
  }
  function transitionToDetail() {
    var stage1layout = calculateLayout('intermediate')(),
        stage2layout = calculateLayout('detail')(),
        stage1viewBounds = stage1layout.filter(function(frame) {
          return frame.canvas.selected;
        })[0].vantage;

    renderState.constraintBounds(stage1viewBounds, true);
    disableScrollEvents();
    container
      .transition()
      .style('opacity', 0);

    renderLayout(stage1layout, true, function() {
      renderLayout(stage2layout, false);
    });
  }
  function selectCanvas() {
    renderLayout(calculateLayout(),false);
  }
  function changeViewingMode() {
    var stage2layout = calculateLayout(viewerState.getState().perspective)();
    renderLayout(stage2layout, true);
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

    var animationTiming = animate ? 1000 : 0,
    frame = container.selectAll('.' + frameClass).data(layoutData);

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

        canvasImageState.setBounds(canvasData.x, canvasData.y, canvasData.width, canvasData.height);
        canvasImageState.getThumbnailResource().show();
      });

    frameEnter.append('div')
      .attr('class', labelClass)
      .text(function(d) { return d.canvas.label; });
  }

  function updateThumb(imageResource) {
    // check if the resource is a thumbnail
    // if it has been requested, add loading class
    // if drawn, add image and give it a class
    // to allow fading in.
    // if failed, give it a failing class
    // if locked, add a lock class
    if (imageResource.status === 'drawn') {
      container
        .selectAll('.' + frameClass)
        .filter(function(d) {
          return d.canvas.id === imageResource.parent.id;
        })
        .selectAll('.' + canvasClass)
        .selectAll('img')
        .data([imageResource.parent.thumbnailResource])
        .enter()
        .append('img')
        .attr('src', function(d) {
          return imageResource.tileSource.levels[0].url;
        });
    }
  }

  function getWidthInPx(d) {
    return d.width + 'px';
  }
  function getHeightInPx(d) {
    return d.height + 'px';
  }

  function getCanvasWidthInPx(d) {
    return d.canvas.width + 'px';
  }
  function getCanvasHeightInPx(d) {
    return d.canvas.height + 'px';
  }

  function getTransformStyle(d) {
    return d3.interpolateString(
      this.style.transform,
      'translate(' + d.x +'px,' + d.y + 'px)'
    );
  }

  function getSelectTransformStyle(d) {
    return d3.interpolateString(
      this.style.transform,
      'translate(' + d.canvas.localX +'px,' + d.canvas.localY + 'px)'
    );
  }

  function getEnterTransformStyle(d) {
    return 'translate(' + d.x + 'px,' + d.y + 'px)';
  }

  function getEnterTranslate(d) {
    return 'translateX(' + d.canvas.localX + 'px) translateY(' + d.canvas.localY + 'px)';
  }

  function getClass(d) {
    var selected = d.canvas.selected;
    return selected ? canvasClass + ' selected' : canvasClass;
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
