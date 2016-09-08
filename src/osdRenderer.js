require('openseadragon');

var OsdRenderer = function(options) {
  var self = this;

  this.dispatcher = options.dispatcher;
  this.renderState = options.renderState;
  this.viewerState = options.viewerState;
  this.viewer = OpenSeadragon({
    element: options.container,
    showNavigationControl: false,
    preserveViewport: true
  });
  this.addOSDHandlers(this.viewerState, this.renderState);

  this.dispatcher.on('canvas-position-updated', function(canvasObject) {
    if (canvasObject.images.length > 0) {
      canvasObject.images.forEach(function(imageResource) {
        self.updateImagePosition(imageResource);
      });
      self.updateImagePosition(canvasObject.thumbnailResource);
    }
  });
  this.dispatcher.on('image-removed', function(imageResource) {
    self.removeTilesource(imageResource);
  });
  this.dispatcher.on('image-needed', function(imageResource) {
    console.log(imageResource);
    self.openTileSource(imageResource);
  });
  this.dispatcher.on('image-show', function(imageResource) {
    // Check whether or not this item has been drawn.
    // This implies that the request has been issued already
    // and the opacity can be updated.
    if (imageResource.getStatus() === 'drawn') {
      self.updateImageOpacity(imageResource);
    }
  });
  this.dispatcher.on('image-hide', function(imageResource) {
    if (imageResource.getStatus() === 'drawn') {
      imageResource.osdTiledImage.setOpacity(0);
    }
  });
  this.dispatcher.on('image-opacity-updated', function(imageResource) {
    if (imageResource.getStatus() === 'drawn') {
      self.updateImageOpacity(imageResource);
    }
  });
  this.dispatcher.on('constraintBoundsUpdated', function(animate) {
    self.setViewerBoundsFromState(animate);
    if (!animate) {
      self.viewer.forceRedraw();
      self.renderState.currentZoom({
        scale: self.getViewerScale(),
        center: self.getZoomTranslation()
      });
    }
  });
  this.dispatcher.on('overviewScrollPositionUpdated', function() {

    var rState = self.renderState.getState();
    var viewBounds = new OpenSeadragon.Rect(
      rState.constraintBounds.x,
      rState.scrollPosition + rState.constraintBounds.y,
      rState.constraintBounds.width,
      rState.constraintBounds.height
    );

    self.viewer.viewport.fitBounds(viewBounds, true);
  });
  this.dispatcher.on('perspectiveUpdated', function() {
    self.changePerspective(self.viewerState.getState().perspective);
  });
  this.dispatcher.on('transitionComplete', function() {
    if(self.viewerState.getState().perspective === 'detail') {
      self.enableZoomAndPan();
    }
  });
};

OsdRenderer.prototype = {
  changePerspective: function(perspective) {
    var self = this;
    if (perspective === 'overview') {
      // disable zooming
      self.disableZoomAndPan();
      return;
    }
  },

  updateItemIndex: function() {
    if(this.tiledImage && this.viewer.world.getItemCount() > this.zIndex) {
      this.viewer.world.setItemIndex(this.tiledImage, this.zIndex);
    }
  },

  removeTilesource: function(imageResource) {
    var self = this;

    if(imageResource.osdTiledImage) {
      self.fadeTilesource(imageResource.osdTiledImage, imageResource.osdTiledImage.getOpacity(), 0, function() {
        // When the tilesource is visually removed, remove it from the scene stack.
        self.viewer.world.removeItem(imageResource.osdTiledImage);
      });
    }
  },

  updateImageOpacity: function(imageResource) {
    if(imageResource.osdTiledImage) {
      imageResource.osdTiledImage.setOpacity(imageResource.opacity * imageResource.parent.getOpacity());
    }
  },

  openTileSource: function(imageResource, tileSource) {
    var self = this;

    // We've already loaded this tilesource
    if(imageResource.status === 'drawn') {
      return;
    }

    imageResource.setStatus('requested');
    var bounds = imageResource.getGlobalBounds();

    this.viewer.addTiledImage({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      tileSource: imageResource.tileSource,
      opacity: imageResource.opacity,
      clip: imageResource.clipRegion,
      index: imageResource.zIndex,

      success: function(event) {
        var tiledImage = event.item;

        imageResource.osdTiledImage = tiledImage;
        imageResource.setStatus('loaded');
        self.syncAllImageProperties(imageResource);

        var tileDrawnHandler = function(event) {
          if (event.tiledImage === tiledImage) {
            imageResource.setStatus('drawn');
            self.viewer.removeHandler('tile-drawn', tileDrawnHandler);
          }
        };
        self.viewer.addHandler('tile-drawn', tileDrawnHandler);
      },

      error: function(event) {
        // Add any auth information here.
        //
        // var errorInfo = {
        //   id: imageResource.osdTileSource,
        //   message: event.message,
        //   source: event.source
        // };
        imageResource.setStatus('failed');
      }
    });
  },

  syncAllImageProperties: function(imageResource) {
    var self = this;

    if(imageResource.osdTiledImage) {
      var bounds = imageResource.getGlobalBounds();
      // If ever the clipRegion parameter becomes
      // writable, add it here.
      imageResource.osdTiledImage.setPosition({
        x:bounds.x,
        y:bounds.y
      }, true);
      imageResource.osdTiledImage.setWidth(bounds.width, true);
      imageResource.osdTiledImage.setOpacity(
        imageResource.getOpacity() * imageResource.parent.getOpacity()
      );
      self.updateImageLayeringIndex(imageResource);
    }
  },

  updateImageLayeringIndex: function(imageResource) {
  },

  updateImagePosition: function(imageResource) {
    if(imageResource.osdTiledImage) {
      var bounds = imageResource.getGlobalBounds();
      bounds = new OpenSeadragon.Rect(bounds.x, bounds.y, bounds.width, bounds.height);
      // the "true" second argument is the "immediately" flag,
      // telling osd not to animate.
      this.viewer.forceRedraw();
      imageResource.osdTiledImage.setPosition(bounds.getTopLeft(), true);
      imageResource.osdTiledImage.setWidth(bounds.width, true);
    }
  },

  fadeTilesource: function(tileSource, startingOpacity, targetOpacity, callback) {
    var self = this;

    var step = (targetOpacity - startingOpacity) / 30;
    if (step === 0) {
      if (callback) callback();
      return;
    }

    var frame = function() {
      startingOpacity += step;
      if ((step > 0 && startingOpacity >= targetOpacity) || (step < 0 && startingOpacity <= targetOpacity)) {
        tileSource.setOpacity(targetOpacity);
        if (callback) callback();
        return;
      }

      tileSource.setOpacity(startingOpacity);
      OpenSeadragon.requestAnimationFrame(frame);
    };
    OpenSeadragon.requestAnimationFrame(frame);
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
    var rState = this.renderState.getState();
    var vState = this.viewerState.getState();
    var viewBounds = new OpenSeadragon.Rect(
      rState.constraintBounds.x,
      rState.constraintBounds.y,
      rState.constraintBounds.width,
      rState.constraintBounds.height
    );

    this.viewer.viewport.fitBounds(viewBounds, !animate);
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

  addOSDHandlers: function() {
    var self = this;

    // Open the main tile source when we reach the specified zoom level on it
    var _semanticZoom = function(zoom, center) {
      var _transitionZoomLevel = 0.01;
      var state = self.viewerState.getState();
      if(zoom >= _transitionZoomLevel) {
        for(var key in state.canvasObjects) {
          if(state.canvasObjects[key].containsPoint(center)) {
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

      // Change the below to check a local variable for
      // whether the request to update is different. If
      // not, then do not re-set the bounds. I believe
      // this is the source of the jitteriness.
      //
      // Essentially if we're already zooming to the bound,
      // then do not re-start the animation spring - just no-op.
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
          self.renderState.inZoomConstraints(true);
          self.viewer.viewport.fitBounds(constraintBounds, false);
          self.renderState.inZoomConstraints(false);
        }
      }

      var zoom = self.viewer.viewport.getZoom();
      var maxZoom = 2;

      if (zoom > maxZoom) {
        self.viewer.viewport.zoomSpring.target.value = maxZoom;
      }
    };

    this.viewer.addHandler('animation', function(event) {
      self.viewer.forceRedraw();
      self.renderState.currentZoom({
        scale: self.getViewerScale(),
        center: self.getZoomTranslation()
      });
    });

    this.viewer.addHandler('zoom', function(event) {
      if (self.viewerState.getState().perspective === 'detail') {
        _applyConstraints();
      }
      // getting the center won't work if there isn't a tilesource
      // already opened, because openseadragon doesn't have a concept
      // of a rectangle without an image ("frame").
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
  }
};

module.exports = OsdRenderer;
