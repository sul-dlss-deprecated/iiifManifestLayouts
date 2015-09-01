'use strict';

var eventHarness = function(container, scrollContainer, manifestor) {
  var canvasClass,
      _zooming,
      perspective;

  function setScrollElementEvents() {
    var animationTiming = 1000;
    var interactionOverlay = d3.select(overlays[0]);
    if (canvasState().perspective === 'detail') {
      interactionOverlay
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
        .transition()
        .duration(animationTiming)
        .style('pointer-events', 'all')
        .style('opacity', 1);

      d3.select(scrollContainer[0])
        .transition()
        .duration(animationTiming)
        .style('pointer-events', 'all')
        .style('overflow-x', 'hidden')
        .style('overflow-y', 'scroll');
    }
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


  container.on('click', '.' + canvasClass, function(event) {
    manifestor.selectCanvas($(this).data('id'));
  });

  scrollContainer.on('scroll', function(event) {
    if (manifestor.getState().perspective === 'overview' && _zooming === false) {
      manifestor.synchronisePan($(this).scrollTop(), $(this).width(), $(this).height());
    }
  });
};

module.exports = eventHarness;
