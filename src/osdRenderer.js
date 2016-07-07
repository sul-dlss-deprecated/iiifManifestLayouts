require('openseadragon');

var OsdRenderer = function(config) {
  var self = this;

  this.dispatcher = config.dispatcher;
  this.renderState = config.renderState;
  this.viewerState = config.viewerState;
  this.scrollContainer = config.scrollContainer;

  this.dispatcher.on('canvas-position-updated', function(canvasObject) {
    canvasObject.images.forEach(function(imageResource) {
      self.updateImagePosition(imageResource);
    });
  });
  this.dispatcher.on('image-needed', function(imageResource) {
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
      self.updateImageOpacity(imageResource);
    }
  });
  this.dispatcher.on('image-opacity-updated', function(imageResource) {
    if (imageResource.getStatus() === 'drawn') {
      self.updateImageOpacity(imageResource);
    }
  });

  // transition start

  // transition end
};

OsdRenderer.prototype = {
  initOSD: function(osdContainer) {
    this.viewer = OpenSeadragon({
      element: osdContainer[0],
      showNavigationControl: false,
      preserveViewport: true
    });

    return this.viewer;
  },

  tileSourceConfig: function(imageResource) {
  },

  updateItemIndex: function() {
    if(this.tiledImage && this.viewer.world.getItemCount() > this.zIndex) {
      this.viewer.world.setItemIndex(this.tiledImage, this.zIndex);
    }
  },

  openThumbnail: function(canvasObject) {
    var self = this;
    this.thumbnail = ThumbnailFactory(this.canvas, self);
    if(this.thumbnail) {
      self.openTileSource(imageResource);
      this.images.push(this.thumbnail);
    } else { // sometimes there isn't a thumbnail
      this.openMainTileSource();
    }
  },

  getTileSourceFromImageResource: function() {
    return {};
  },

  removeThumbnail: function(imageResource) {
    if(imageResource.thumbnail){
      imageResource.thumbnail.fade(0);
      imageResource.thumbnail.removeFromCanvas();
      imageResource.thumbnail.destroy();
      delete imageResource.thumbnail;
    }
  },

  removeTilesource: function(imageResourceID) {
    if(this.tiledImage) {
      this.viewer.world.removeItem(this.tiledImage);
      this.tiledImage = null;
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
    if(imageResource.status === 'shown') {
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

        var tileDrawnHandler = function(event) {
          if (event.tiledImage === tiledImage) {
            imageResource.setStatus('drawn');
            self.syncAllImageProperties(imageResource);
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
    console.log(self);

    if(imageResource.osdTiledImage) {
      var bounds = imageResource.getGlobalBounds();
      // the "true" second argument is the "immediately" flag,
      // telling osd not to animate.
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
      imageResource.osdTiledImage.setPosition(bounds.getTopLeft(), true);
      imageResource.osdTiledImage.setWidth(bounds.width, true);
    }
  },

  fadeTilesource: function(targetOpacity, callback) {
    var self = this;
    var currentOpacity = this.opacity;
    var step = (targetOpacity - currentOpacity) / 30;
    if (step === 0) {
      if (callback) callback();
      return;
    }

    var frame = function() {
      currentOpacity += step;
      if ((step > 0 && currentOpacity >= targetOpacity) || (step < 0 && currentOpacity <= targetOpacity)) {
        self.setOpacity(targetOpacity);
        if (callback) callback();
        return;
      }

      self.setOpacity(currentOpacity);
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
    if(!this.viewer) {
      return;
    }
    var rState = this.renderState.getState();
    var vState = this.viewerState.getState();
    var viewBounds = new OpenSeadragon.Rect(
      rState.overviewLeft,
      rState.overviewTop + rState.lastScrollPosition,
      vState.width,
      vState.height
    );

    console.log(animate);
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
            self.openMainTileSource(state.canvasObjects[key]);
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
    };

    this.viewer.addHandler('zoom', function(event) {
      if (self.viewerState.getState().perspective === 'detail') {
        _applyConstraints();
      }
      // getting the center won't work if there isn't a tilesource
      // already opened, because openseadragon doesn't have a concept
      // of a rectangle without an image ("frame").
      var center = self.viewer.viewport.getBounds().getCenter();
      // _semanticZoom(event.zoom, center);
    });

    this.viewer.addHandler('pan', function(event) {
      if (self.viewerState.getState().perspective === 'detail') {
        _applyConstraints();
      }
      var zoom = self.viewer.viewport.getZoom();
      // _semanticZoom(zoom, event.center);
    });
  }
};

module.exports = OsdRenderer;
