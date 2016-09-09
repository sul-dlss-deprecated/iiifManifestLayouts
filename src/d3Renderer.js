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
  dispatcher.on('canvasNavigated', navigateCanvas);
  dispatcher.on('viewingModeUpdated', changeViewingMode);
  dispatcher.on('changeViewingDirection', changeViewingDirection);
  dispatcher.on('scaleFactorUpdated', immediateUpdate);
  dispatcher.on('sizeUpdated', immediateUpdate);
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
      renderState.scrollPosition(this.scrollTop);
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
        left: 0,
        'pointer-events': 'none'
      });
  }

  function disableScrollEvents() {
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
    if (!renderState.zooming() && viewerState.getState().perspective === 'overview') {
      // We don't want OSD to drive in overview mode.
      // D3 takes over in ovweview mode, so we do
      // nothing in response to openseadragon readjusting itself,
      // which would create a circular loop of
      // events triggering events triggering events.
      return;
    }
    var scale = renderState.getState().currentZoom.scale;
    var center = renderState.getState().currentZoom.center;
    var transform = 'scale(' + scale + ') translate(' + -center.x + 'px,' + -center.y + 'px)';

    scrollContainer.node().scrollTop = center.y;

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

    renderLayout(layout, false);
    renderState.constraintBounds(viewBounds, false);

    var scale = renderState.getState().currentZoom.scale;
    var center = renderState.getState().currentZoom.center;
    var transform = 'scale(' + scale + ') translate(' + -center.x + 'px,' + -center.y + 'px)';

    container
      .style('transform', transform)
      .style('-webkit-transform', transform);

    if (viewerState.getState().perspective === 'detail') {
      disableScrollEvents();
      scrollContainer
        .style('opacity', 0);
    } else {
      scrollContainer
        .style('opacity', 1);
      enableOverviewScrollEvents();
    }
  }

  function changePerspective() {
    if (viewerState.getState().perspective === 'detail') {
      transitionToDetail();
      return;
    }
    transitionToOverview();
  }

  function transitionToOverview() {
    var stage1layout = calculateLayout('intermediate')(),
        stage2layout = calculateLayout('overview')(),
        stage1viewBounds = stage1layout.filter(function(frame) {
          return frame.canvas.selected;
        })[0].vantage,
        stage2viewBounds = stage2layout.filter(function(frame) {
          return frame.canvas.selected;
        })[0].vantage;

    // Some initial event sending and setup to start the
    // animation sequence.
    renderState.constraintBounds(stage1viewBounds, false);
    renderState.zooming(true);
    scrollContainer
      .transition()
      .style('opacity', 1);

    var scale = renderState.getState().currentZoom.scale;
    var center = renderState.getState().currentZoom.center;
    var transform = 'scale(' + scale + ') translate(' + -center.x + 'px,' + -center.y + 'px)';

    container
      .style('transform', transform)
      .style('-webkit-transform', transform);

    // Run stage 1 of the animation
    renderLayout(stage1layout, false, function() {
      // this callback does setup for stage 2 of the animation
      // and then kicks it off.

      renderLayout(stage2layout, true, function() {
        // This callback signals the end of the transition.
        renderState.zooming(false);
        dispatcher.emit('transitionComplete');
        enableOverviewScrollEvents();
        var transform = 'scale(1) translate(0,0)';
        container
          .style('transform', transform)
          .style('-webkit-transform', transform);
      });
      renderState.constraintBounds(stage2viewBounds, true);
    });
  }

  function transitionToDetail() {
    // Setting up the keyFrame target parameters for
    // the animation stages.
    var stage1layout = calculateLayout('intermediate')(),
        stage2layout = calculateLayout('detail')(),
        stage1viewBounds = stage1layout.filter(function(frame) {
          return frame.canvas.selected;
        })[0].vantage,
        stage2viewBounds = stage2layout.filter(function(frame) {
          return frame.canvas.selected;
        })[0].vantage;

    // Some initial event sending and setup to start the
    // animation sequence.
    renderState.constraintBounds(stage1viewBounds, true);
    renderState.zooming(true);
    disableScrollEvents();
    scrollContainer
      .transition()
      .style('opacity', 0);
    container
      .transition()
      .style('opactiy', 0);

    // Run stage 1 of the animation
    renderLayout(stage1layout, true, function() {
      // this callback does setup for stage 2 of the animation
      // and then kicks it off.
      renderLayout(stage2layout, false, function() {
        // This callback signals the end of the transition.
        renderState.zooming(false);
        dispatcher.emit('transitionComplete');
      });
      renderState.constraintBounds(stage2viewBounds, false);
    });
  }
  function anchorFrames(frames, anchor) {
    var offsetx = 0;
    var offsety = 0;

    frames.foreach(function(frame) {
      if (frame.canvas.selected) {
        offsetx = anchor.x - (frame.x + frame.canvas.localx);
        offsety = anchor.y - (frame.y + frame.canvas.localy);
      }
    });

    frames.foreach(function(frame) {
      frame.x += offsetx;
      frame.y += offsety;
    });

    return frames;
  }
  function navigateCanvas() {
    var stage1layout = calculateLayout('detail')(),
        stage1viewBounds = stage1layout.filter(function(frame) {
          return frame.canvas.selected;
        })[0].vantage;
    renderState.constraintBounds(stage1viewBounds, true);
    disableScrollEvents();

    renderLayout(stage1layout, true, function() {
    });
  }
  function changeViewingMode() {
    var layout,
        viewBounds;

    if (viewerState.getState.perspective === 'overview') {
      layout = calculateLayout(viewerState.getState().perspective)();
      viewBounds = layout.filter(function(frame) {
        return frame.canvas.selected;
      })[0].vantage;

      renderState.constraintBounds(viewBounds, true);
      renderLayout(layout, true, function() {
        dispatcher.emit('transitionComplete');
      });
    } else {
      layout = calculateLayout(viewerState.getState().perspective)();
      viewBounds = layout.filter(function(frame) {
        return frame.canvas.selected;
      })[0].vantage;

      renderState.constraintBounds(viewBounds, true);
      renderLayout(layout, true, function() {
        dispatcher.emit('transitionComplete');
      });
    }
  }
  function changeViewingDirection() {
    var layout = calculateLayout(viewerState.getState().perspective)(),
    viewBounds = layout.filter(function(frame) {
      return frame.canvas.selected;
    })[0].vantage;
    renderState.constraintBounds(viewBounds,false);
    renderLayout(layout, false, function() {
      dispatcher.emit('transitionComplete');
    });
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
      canvasWidth: 200,
      selectedCanvas: userState.selectedCanvas,
      framePadding: userState.framePadding,
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
    var animationTiming = animate ? 1300 : 0,
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
            state = viewerState.getState(),
            canvasImageState = viewerState.getState().canvasObjects[canvasData.id];

        canvasImageState.setBounds(canvasData.x, canvasData.y, canvasData.width, canvasData.height);

        if (state.selectedCanvas !== canvasImageState.canvas['@id']) {
          if (canvasImageState.getThumbnailResource()){
            canvasImageState.getThumbnailResource().show();
          }
        } else {
          canvasImageState.show();
        }
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
    // If failed, give it a failing class
    // if locked, add a lock class
    switch (imageResource.status) {
    case 'drawn':
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
          return imageResource.parent.thumbnailResource.tileSource.levels[0].url;
        });
      break;
    case 'initialized':
    case 'requested':
    case 'failed':
    case 'unauthorized':
    }
  }

  // Various Utilities
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
    var canvasObject = viewerState.getState().canvasObjects[d.canvas.id],
        selected = d.canvas.selected ? ' selected': '',
        blank = canvasObject.images.length < 1 ? ' blank': '',
        loading = '',
        failed = '',
        locked = '';

    if (canvasObject.getThumbnailResource()) {
      loading = canvasObject.getThumbnailResource().getStatus() === 'requested' ? ' loading': '';
      failed = canvasObject.getThumbnailResource().getStatus() === 'failed' ? ' failed': '';
      locked = canvasObject.getThumbnailResource().getStatus() === 'failed' ? ' locked': '';
    }

    return canvasClass + selected + blank + loading + failed + locked;
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
