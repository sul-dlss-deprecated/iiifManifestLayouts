require('openseadragon');

var OSDUtils = function() {
};

OSDUtils.prototype = {
  initOSD: function(osdContainer) {
    this.viewer = OpenSeadragon({
      element: osdContainer[0],
      showNavigationControl: false,
      preserveViewport: true
    });

    return this.viewer;
  },

  disableZoomAndPan: function() {
    this.viewer.zoomPerClick = 1;
    this.viewer.zoomPerScroll = 1;
    this.viewer.panHorizontal = false;
    this.viewer.panVertical = false;
  },

  enableZoomAndPan: function() {
    this.viewer.zoomPerClick = 2;
    this.viewer.zoomPerScroll = 1.2;
    this.viewer.panHorizontal = true;
    this.viewer.panVertical = true;
  },

  setViewerBoundsFromState: function(animate) {
    if(!this.viewer) {
      return;
    }
    var rState = this.renderState.getState();
    var vState = this.viewerState.getState();
    var viewBounds = new OpenSeadragon.Rect(rState.overviewLeft, rState.overviewTop + rState.lastScrollPosition, vState.width, vState.height);
    this.viewer.viewport.fitBounds(viewBounds, animate);
  },

  getViewerScale: function() {
    var zoom = this.viewer.viewport.getZoom(true);
    var width = this.viewer.container.clientWidth;

    return width * zoom;
  },

  getZoomTranslation: function() {
    var viewerWidth = this.viewer.container.clientWidth;
    var viewerHeight = this.viewer.container.clientHeight;
    var center = this.viewer.viewport.getCenter(true);
    var p = center.minus(new OpenSeadragon.Point(viewerWidth / 2, viewerHeight / 2))
          .minus(new OpenSeadragon.Point(0, this.renderState.getState().lastScrollPosition));

    return p;
  },

  addOSDHandlers: function(viewerState, renderState) {
    this.viewerState = viewerState;
    this.renderState = renderState;
    var self = this;

    // Open the main tile source when we reach the specified zoom level on it
    var _semanticZoom = function(zoom, center) {
      var _transitionZoomLevel = 0.01;
      var state = self.viewerState.getState();
      if(zoom >= _transitionZoomLevel) {
        for(var key in state.canvasObjects) {
          if(state.canvasObjects[key].containsPoint(center)) {
            state.canvasObjects[key].openMainTileSource();
          }
        }
      }
    };


    var _applyConstraints = function() {
      var state = self.renderState.getState();
      var constraintBounds = new OpenSeadragon.Rect(
        state.constraintBounds.x,
        state.constraintBounds.y,
        state.constraintBounds.width,
        state.constraintBounds.height
      );

      if (constraintBounds && !state.inZoomConstraints) {
        var changed = false;
        var currentBounds = self.viewer.viewport.getBounds();

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
          self.renderState.setState({ inZoomConstraints: true });
          self.viewer.viewport.fitBounds(currentBounds);
          self.renderState.setState({ inZoomConstraints: false });
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
    this.viewer.addHandler('zoom', function(event) {
      if (self.viewerState.getState().perspective === 'detail') {
        _applyConstraints();
      }
      var center = self.viewer.viewport.getBounds().getCenter();
      _semanticZoom(event.zoom, center);
    });

    this.viewer.addHandler('pan', function(event) {
      if (self.viewerState.getState().perspective === 'detail') {
        _applyConstraints();
      }
      var zoom = self.viewer.viewport.getZoom();
      _semanticZoom(zoom, event.center);
    });

    this.viewer.addHandler('canvas-click', function(event) {
      var hitCanvases = [];
      var clickPosition = self.viewer.viewport.pointFromPixel(event.position);
      var state = viewerState.getState();
      for(var key in state.canvasObjects) {
        if(state.canvasObjects[key].containsPoint(clickPosition)){
          hitCanvases.push(state.canvasObjects[key]);
        }
      }
      if(event.quick && hitCanvases[0]) {
        var bounds = hitCanvases[0].getBounds();
        self.viewer.viewport.fitBounds(bounds);
        hitCanvases[0].openMainTileSource();
      }
    });
  }
};

module.exports = OSDUtils;
