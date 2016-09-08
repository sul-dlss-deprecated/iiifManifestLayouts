var manifestLayout = function (options) {
  var maxCanvasHeight = options.maxCanvasHeight || 130,
      // screen pixels
  maxCanvasWidth = options.maxCanvasWidth || 30,
      // screen pixels
  minCanvasWidth = options.minCanvasWidth || 30,
      // screen pixels
  minCanvasHeight = options.minCanvasHeight || 30,
      // screen pixels
  canvasHeight = options.canvasHeight * options.scaleFactor || 100,
      // screen pixels
  canvasWidth = options.canvasWidth * options.scaleFactor || 30,
      // screen pixels
  scaleFactor = options.scaleFactor || 1,
      columns = options.columns || 8,
      framePadding = {
    top: options.framePadding.top || 0,
    bottom: options.framePadding.bottom || 0,
    left: options.framePadding.left || 0,
    right: options.framePadding.right || 0
  },
      facingCanvasPadding = options.facingCanvasPadding,
      // screen pixels
  minimumImageGap = options.minimumImageGap,
      viewportPadding,
      // screen pixels
  containerHeight = options.height,
      containerWidth = options.width,
      canvases = options.canvases,
      selectedCanvas = options.selectedCanvas,
      framingStrategy = options.framingStrategy || 'contain',
      viewingDirection = options.viewingDirection || 'left-to-right',
      viewingMode = options.viewingMode || 'individuals',
      lineStrategy = options.viewingMode || 'grid',


  // Layout Constants
  // Storing strategies for specific states
  framingStrategies = {
    // different ways the canvas
    // will be forced into its canvas
    // or be allowed to shape its canvas
    contain: contain,
    // fitHeight: fitHeight,
    // fitWidth: fitHeight,
    hybrid: hybrid
  },

  // readingDirections = {
  // leftToRight: leftToRight,
  // rightToLeft: rightToLeft //,
  // topToBottom: ...,
  // bottomToTop: ...
  // },
  lineStrategies = {
    // fixedWidthColumns: fixedColumnLine,
    // fixedHeightRows: fixedHeightLine,
    grid: gridAlign
  },
      viewport = makeViewport(containerWidth, containerHeight, options.viewportPadding);

  function makeViewport(width, height, viewportPadding) {
    var horizontalMargin, verticalMargin;

    var viewport = {
      padding: viewportPadding || {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0 // units in % of pixel height of viewport
      },
      width: width,
      height: height,
      aspectRatio: width / height
    };

    horizontalMargin = viewport.padding.left + viewport.padding.right;
    verticalMargin = viewport.padding.top + viewport.padding.bottom;

    viewport.paddedWidth = width - width * (horizontalMargin / 100);
    viewport.paddedHeight = height - height * (verticalMargin / 100);
    viewport.paddedAspectRatio = viewport.paddedWidth / viewport.paddedHeight;

    return viewport;
  }

  function pruneCanvas(canvas, index) {

    var prunedCanvas = {
      id: canvas['@id'],
      label: canvas.label,
      height: canvas.height,
      width: canvas.width,
      aspectRatio: canvas.width / canvas.height,
      selected: canvas['@id'] === selectedCanvas ? true : false,
      sequencePosition: index
    };
    return prunedCanvas;
  }

  // The following framingStrategies specify how a canvas fits inside its "canvas".
  // A "canvas" is an abstract target that the user may click on.
  // #Terminology
  // ##Frame
  // The hoverable and clickable target area that will fill the viewport if it is clicked.
  // In the case of a book object, a frame will contain both pages. It contains the
  // "Canvas" for the eventual zooming canvas object.
  // ##Canvas
  // The canvas is an html element that can be styled with properties such as "background color",
  // "drop-shadow", and "transform: scale" for effect. It provides a visible and interactive
  // placeholder until the thumbnail or actual canvas tilesources are loaded.
  // ##Canvas
  // This will be the layout element used by osd for its tilesource positioning in its "world"
  // coordinate system.
  // ##Thumb
  // A representation of the canvas that can be retreived in 1 request rather than 2. It will
  // be provided to openseadragon as a dummy tilesource while the info.json is retrieved.
  // ##Label
  // Provided by the manifest. No real determination is made about the label except that a
  // certain amount of space is made for it if desired. This space is important for calculating
  // the positions of the eventual Canvas tilesources in the osd "world", but within the space
  // provided they can be freely styled with css (An interesting possiblity is to use
  // flowType.js for varying the font size by the element width).

  function contain(canvas, canvasWidth, canvasHeight) {
    // The item target is the same regardless of the object inside of it,
    // and the canvas is scaled down on its longest side in order to fit
    // inside of the box. Alternatively, there may be allowed a fixed-size
    // "portrait" or "landscape" view into which the object is scaled
    // depending on its aspect ratio bias.
    var portrait = canvas.aspectRatio <= 1.0 ? true : false,
        widthScaleFactor = canvasWidth / canvas.width,
        heightScaleFactor = canvasHeight / canvas.height;

    if (portrait) {
      fitHeight(canvas, canvasHeight);
    } else {
      fitWidth(canvas, canvasWidth);
    }

    return canvas;
  }

  function fitHeight(canvas, canvasHeight) {
    var portrait = canvas.aspectRatio <= 1.0 ? true : false,
        scaleFactor = canvasHeight / canvas.height;

    canvas.height = canvasHeight;
    // we forced the height to fit, so the width
    // must be scaled according to the height.
    canvas.width = canvas.width * scaleFactor;

    return canvas;
  }

  function fitWidth(canvas, canvasWidth) {
    var portrait = canvas.aspectRatio <= 1.0 ? true : false,
        scaleFactor = canvasHeight / canvas.width;

    canvas.width = canvasWidth;
    // we forced the width to fit, so the height
    // must be scaled according to the width.
    canvas.height = canvas.height * scaleFactor;

    return canvas;
  }

  function hybrid(canvas, maxCanvasWidth, maxCanvasHeight) {
    // Fixed height layout with auto-fitting
    // of extremely long or extremeley tall
    // objects into a maximum width.
  }

  function frame(canvas, padding) {
    // A frame can wrap several book pages
    // into what will become a single higlight,
    // hover, or click target.
    canvas.localX = padding.left;
    canvas.localY = padding.top;
    return {
      width: canvas.width + padding.left + padding.right,
      height: canvas.height + padding.top + padding.bottom,
      canvas: canvas
    };
  }

  function gridAlign(frames, canvasHeight, canvasWidth, lineWidth) {
    var framesPerLine = Math.floor(lineWidth / canvasWidth),
        framesLength = frames.length;

    return frames.map(function (frame, index) {
      var lineNumber = Math.floor(index / framesPerLine),
          lineIndex = index % framesPerLine;
      // The canvass must get their x and y properties
      // after the frame (the parent) props are set.
      frame.x = frame.width * lineIndex;
      frame.y = lineNumber * frame.height; // y determined by the line;

      frame.canvases.forEach(function (canvas, index) {
        canvas.localX = frame.leftPadding;
        canvas.localY = frame.topPadding;
        canvas.x = frame.x + frame.leftPadding;
        canvas.y = frame.y + frame.topPadding;
      });

      return frame;
    });
  }

  function bindCanvases(canvases, viewingMode, viewingDirection, framePadding, facingCanvasPadding) {

    if (viewingMode === 'paged') {
      var pages = canvases.filter(function (canvas) {
        return canvas.viewingHint === 'non-paged' ? false : true;
      });
      if (viewingDirection === 'left-to-right') {
        return pages.map(function (canvas, index) {
          var boundPagePadding;

          if (index === 0) {
            boundPagePadding = {
              top: framePadding.top,
              bottom: framePadding.bottom,
              left: framePadding.left,
              right: framePadding.right
            };
            boundPagePadding.left = canvas.width + facingCanvasPadding / 100 * canvas.width;
            return frame(canvas, boundPagePadding);
          } else if ((index + 1) % 2 === 0) {
            // gets all even pages and makes
            // their facing page the next page
            // in the index.
            boundPagePadding = {
              top: framePadding.top,
              bottom: framePadding.bottom,
              left: framePadding.left,
              right: canvas.width * facingCanvasPadding / 100 / 2
            };

            return frame(canvas, boundPagePadding);
          } else {

            boundPagePadding = {
              top: framePadding.top,
              bottom: framePadding.bottom,
              left: canvas.width * facingCanvasPadding / 100 / 2,
              right: framePadding.right
            };

            return frame(canvas, boundPagePadding);
          }
        });
      }
      if (viewingDirection === 'right-to-left') {
        return pages.map(function (canvas, index) {
          var boundPagePadding;

          if (index === 0) {
            boundPagePadding = {
              top: framePadding.top,
              bottom: framePadding.bottom,
              left: framePadding.left,
              right: canvas.width * facingCanvasPadding / 100 / 2
            };
            boundPagePadding.left = canvas.width + facingCanvasPadding / 100 * canvas.width;
            return frame(canvas, boundPagePadding);
          } else if ((index + 1) % 2 === 0) {
            // gets all even pages and makes
            // their facing page the next page
            // in the index.
            boundPagePadding = {
              top: framePadding.top,
              bottom: framePadding.bottom,
              left: framePadding.left,
              right: canvas.width * facingCanvasPadding / 100 / 2
            };

            return frame(canvas, boundPagePadding);
          } else {

            boundPagePadding = {
              top: framePadding.top,
              bottom: framePadding.bottom,
              left: canvas.width * facingCanvasPadding / 100 / 2,
              right: framePadding.right
            };

            return frame(canvas, boundPagePadding);
          }
        });
      }
    } else if (viewingMode === 'continuous') {
      // This just assumes we're talking horizontal.
      // As you can imagine, this is going to get out of
      // hand quickly. It would be nice to go back to
      // named functions, even if we're going to need like
      // 45 of them. Then the possible layouts can be
      // expressed as sequences of a few intelligibly-named
      // functions, configured as 3-5 step flows based on
      // the input parameters. Another day, perhaps.
      var boundPagePadding = {
        top: framePadding.top,
        bottom: framePadding.bottom,
        left: 0,
        right: 0
      };
      return canvases.map(function (canvas) {
        return frame(canvas, boundPagePadding);
      });
    } else {
      return canvases.map(function (canvas) {
        return frame(canvas, framePadding);
      });
    }
  }

  /**
   * Determines a facing page type
   * @returns {String}
   */
  function facingPageType(index) {
    if (index === 0) {
      return 'firstPage';
    } else if (index % 2 === 0) {
      return 'rightPage';
    } else {
      return 'leftPage';
    }
  }

  var Lines = function (lineWidth, frames) {
    this.x = 0;
    this.y = 0;
    this.lineWidth = lineWidth;
    this.frames = frames;
  };

  Lines.prototype = {
    _getFacingFrame: function (index) {
      var type = facingPageType(index);

      if (type === 'leftPage') {
        return this.frames[index + 1];
      }

      if (type === 'rightPage') {
        return this.frames[index - 1];
      }

      return null;
    },

    /**
     * @param frame
     * @returns {Object} x, y
     */
    addItem: function (frame) {
      var lineItemWidth = frame.width,
          output;

      if (viewingMode === 'paged') {
        var facingFrame = this._getFacingFrame(frame.canvas.sequencePosition);
        if (facingFrame) {
          if (facingFrame.canvas.sequencePosition > frame.canvas.sequencePosition) {
            lineItemWidth += facingFrame.width;
          } else {
            lineItemWidth = 0;
          }
        }
      }

      if (viewingDirection === 'left-to-right') {
        if (this.x + lineItemWidth > this.lineWidth) {
          this.x = 0;
          this.y += frame.height;
        }

        output = {
          x: this.x,
          y: this.y
        };

        this.x += frame.width;
      }
      if (viewingDirection === 'right-to-left') {
        if (this.x - lineItemWidth > this.lineWidth) {
          this.x = 0;
          this.y += frame.height;
        }

        output = {
          x: this.lineWidth - (this.x - lineItemWidth),
          y: this.y
        };

        this.x += frame.width;
      }
      if (viewingDirection === 'top-to-bottom') {}
      if (viewingDirection === 'bottom-to-top') {}

      return output;
    }
  };

  function fixedHeightAlign(frames, lineWidth) {
    var lines = new Lines(lineWidth, frames);

    return frames.map(function (frame) {
      var lineStats = lines.addItem(frame);
      frame.x = lineStats.x;
      frame.y = lineStats.y;
      frame.canvas.x = frame.x + frame.canvas.localX;
      frame.canvas.y = frame.y + frame.canvas.localY;
      return frame;
    });
  }

  function alignToAnchor(frames, anchor) {
    var offsetX = 0;
    var offsetY = 0;

    frames.forEach(function (frame) {
      if (frame.canvas.selected) {
        offsetX = anchor.x - (frame.x + frame.canvas.localX);
        offsetY = anchor.y - (frame.y + frame.canvas.localY);
      }
    });

    frames.forEach(function (frame) {
      frame.x += offsetX;
      frame.y += offsetY;
    });

    return frames;
  }

  function updateCanvases(frames) {
    frames.forEach(function (frame) {
      frame.canvas.x = frame.x + frame.canvas.localX;
      frame.canvas.y = frame.y + frame.canvas.localY;
    });

    return frames;
  }

  function overviewLayout() {
    // configure for viewingDirection, viewingMode, framing technique,
    // and alignment Style.
    var frames = bindCanvases(canvases.map(pruneCanvas).map(function (canvas) {
      // resizes canvases for the chosen layout strategy.
      return fitHeight(canvas, canvasHeight);
    }), viewingMode, viewingDirection, framePadding, facingCanvasPadding);

    frames = addViewportPadding(fixedHeightAlign(frames, viewport.paddedWidth));
    frames = updateCanvases(frames);
    var selectedFrame = frames.filter(function (frame) {
      return frame.canvas.selected;
    })[0];

    selectedFrame.vantage = getOverviewVantage(frames);
    return frames;
  }

  function detailLayout() {
    return detailLayoutHorizontal();
  }

  function detailLayoutHorizontal() {
    // configure for viewingDirection, viewingMode, framing technique,
    // and alignment Style.
    var frames = bindCanvases(canvases.map(pruneCanvas).map(function (canvas) {
      // resizes canvases for the chosen layout strategy.
      return fitHeight(canvas, canvasHeight);
    }), viewingMode, viewingDirection, framePadding, facingCanvasPadding);

    var x = 0;
    var y = 0;

    if (viewingDirection === 'left-to-right') {
      frames.forEach(function (frame) {
        frame.x = x;
        frame.y = y;
        x += frame.width;
      });
      updateCanvases(frames);
      frames = intermediateLayoutHorizontal(frames);
    } else if (viewingDirection === 'right-to-left') {
      frames.reverse().forEach(function (frame) {
        frame.x = x;
        frame.y = y;
        x += frame.width;
      });
      updateCanvases(frames);
      frames = intermediateLayoutHorizontal(frames.reverse());
    }
    return frames;
  }

  function intermediateLayout() {
    // configure for viewingDirection, viewingMode,
    // and alignment Style (scaling).
    return intermediateLayoutHorizontal(overviewLayout());
  }

  function intermediateLayoutHorizontal(frames) {
    var selectedFrame = frames.filter(function (frame) {
      return frame.canvas.selected;
    })[0];

    var facingCanvas = getFacingCanvas(selectedFrame.canvas, frames);
    var canvasPosition = selectedFrame.canvas.sequencePosition;
    selectedFrame.vantage = getVantageForCanvas(selectedFrame.canvas, facingCanvas);

    if (viewingMode !== 'continuous') {
      frames.forEach(function (frame, index, allFrames) {
        // These canvases are on the same row as the selected canvas(es), but not selected.
        if (frame.y === selectedFrame.y && frame.canvas.id !== selectedFrame.canvas.id) {
          if (viewingMode === 'paged' && frame.canvas.id === facingCanvas.id) {
            return;
          }

          if (viewingDirection === 'left-to-right') {
            // These are the canvases within the same line of the overview layout.
            if (index < canvasPosition) {
              // Those to the left. Push them to the left, out of frame.
              frame.x = frame.x - (selectedFrame.vantage.leftMargin + framePadding.left);
            } else {
              // Those to the right. Push them to the right, out of frame.
              frame.x = frame.x + (selectedFrame.vantage.rightMargin + framePadding.right);
            }
          } else if (viewingDirection === 'right-to-left') {
            // These are the canvases within the same line of the overview layout.
            if (index > canvasPosition) {
              // Those to the left. Push them to the left, out of frame.
              frame.x = frame.x - (selectedFrame.vantage.leftMargin + framePadding.left);
            } else {
              // Those to the right. Push them to the right, out of frame.
              frame.x = frame.x + (selectedFrame.vantage.rightMargin + framePadding.right);
            }
          }
        } else if (frame.y > selectedFrame.y) {
          // These are all the canvases below the selected canvas
          // in the overview layout. Push then down out of frame.
          frame.y = frame.y + (selectedFrame.vantage.bottomMargin + framePadding.bottom);
        } else if (frame.y < selectedFrame.y) {
          // These are all the canvases above the selected canvas
          // in the overview layout. Push them up out of frame.
          frame.y = frame.y - (selectedFrame.vantage.topMargin + framePadding.top);
        }
      });
    }

    frames = updateCanvases(frames);
    return frames;
  }

  var getFramesBoundingBox = function (frames) {

    var maxX = -Infinity,
        maxY = -Infinity,
        minX = Infinity,
        minY = Infinity;

    frames.forEach(function (frame) {
      if (frame.x < minX) minX = frame.x;
      if (frame.y < minY) minY = frame.y;
      if (frame.x + frame.width > maxX) {
        maxX = frame.x + frame.width;
      }
      if (frame.y + frame.height > maxY) {
        maxY = frame.y + frame.height;
      }
    });

    // Get a box that contains the topLeftmost
    // topRightmost canvas of the selection.
    // Will need to be updated for viewingDirections.

    // Calculate a bounding box for the complete layout.
    var layoutBBWidth = maxX + Math.abs(minX),
        layoutBBHeight = maxY + Math.abs(minY);

    return {
      x: minX,
      y: minY,
      width: layoutBBWidth,
      height: layoutBBHeight
    };
  };

  function getCenter(frame) {
    return {
      x: frame.x + frame.width / 2,
      y: frame.y + frame.height / 2
    };
  }

  function addViewportPadding(frames) {
    return frames.map(function (frame) {
      frame.x = frame.x + containerWidth * viewport.padding.left / 100;
      frame.y = frame.y + containerHeight * viewport.padding.top / 100;
      return frame;
    });
  }

  function getOverviewVantage(frames) {
    // calculates the viewport dimensions
    // that center the selected canvas in the
    // overview layout.
    var selectedFrame = frames.filter(function (frame) {
      return frame.canvas.selected;
    })[0],
        selectedFrameCenter,
        boundingBox = {
      x: 0,
      y: 0,
      width: viewport.paddedWidth,
      height: viewport.paddedHeight
    },
        vantage = padVantage(boundingBox);

    if (selectedFrame) {
      selectedFrameCenter = getCenter(selectedFrame);

      // Consider adapting for another "clamp" function
      // to keep the vantage within "viewport/layout" bounds.
      // This will need to also take into account the viewing
      // direction.
      var selectedVantageTop = selectedFrameCenter.y - vantage.height / 2;
      // selectedVantageBottom = selectedFrameCenter + vantage.height/2,
      // selectedVantageLeft = selectedFrameCenter.x - vantage.width/2,
      // selectedVantageRight = selectedFrameCenter + vantage.width/2;

      vantage.x = 0;
      vantage.y = selectedVantageTop < 0 ? 0 : selectedVantageTop;
      return vantage;
    } else {
      return vantage;
    }
  }

  function getVantageForSelectedCanvas(frames) {
    var selectedFrame = frames.filter(function (frame) {
      return frame.canvas.selected;
    })[0];

    var facingCanvas = getFacingCanvas(selectedFrame.canvas, frames);

    selectedFrame.vantage = getVantageForCanvas(selectedFrame.canvas, facingCanvas);
  }

  /**
   * Calculates a vantage for a selected canvas
   * @param {Object} selectedCanvas
   * @param {Object} previousFrame
   * @param {Object} nextFrame
   */
  function getVantageForCanvas(selectedCanvas, facingCanvas) {
    var boundingBoxAspectRatio,
        vantageWidth,
        vantageHeight,
        combinedCanvasWidths,
        x,
        pairHeight,

    // This requires calculating in units of the viewport pixels, and
    // converting them to the appropriate size.
    selectionBoundingBox = {};

    // Set the selectionBoundingBox.width, portrait, and x values based on the
    // location of the paged frame.
    if (viewingMode === 'paged') {
      var selectionIndex = selectedCanvas.sequencePosition;
      if (selectionIndex === 0) {
        // first page
        combinedCanvasWidths = selectedCanvas.width * 2;
        x = selectedCanvas.x - selectedCanvas.width;
        pairHeight = selectedCanvas.height;
      } else if (selectionIndex % 2 === 0) {
        // right page
        combinedCanvasWidths = selectedCanvas.width + facingCanvas.width;
        combinedCanvasWidths += facingCanvasPadding / 100 * combinedCanvasWidths;
        x = facingCanvas.x;
        pairHeight = Math.max(selectedCanvas.height, facingCanvas.height);
      } else {
        // left page
        combinedCanvasWidths = selectedCanvas.width + facingCanvas.width;
        combinedCanvasWidths += facingCanvasPadding / 100 * combinedCanvasWidths;
        x = selectedCanvas.x;
        pairHeight = Math.max(selectedCanvas.height, facingCanvas.height);
      }
      selectionBoundingBox = {
        x: x,
        y: selectedCanvas.y,
        width: combinedCanvasWidths,
        height: pairHeight
      };
    } else {
      x = selectedCanvas.x;
      selectionBoundingBox = {
        x: selectedCanvas.x,
        y: selectedCanvas.y,
        width: selectedCanvas.width,
        height: selectedCanvas.height
      };
    }

    return getVantage(selectionBoundingBox);
  }

  /**
   * Calculates a vantage for a given bounding box.
   * @param {Object} boundingBox
   *     The bounding box can be from anywhere.
   *     In our case we want it to contain a canvas
   *     or a group of canvases.
   * @param {Object} viewport
   */
  function getVantage(boundingBox) {
    var boundingBoxAspectRatio = boundingBox.width / boundingBox.height,
        vantageWidth,
        vantageHeight,
        horizontalMargin,
        verticalMargin,
        minimumViewportPadding = 5; // units in % of the _viewport_ width/height.
    // (as the case may be)
    if (viewport.paddedAspectRatio >= boundingBoxAspectRatio) {
      // The primary dimension must be defined first, and the other
      // will be scaled according to the aspect ratio. In this case,
      // the viewport is wider than the canvas is tall. This means
      // the canvas's longest dimension will need to fit inside the
      // viewport's shortest dimension.
      //
      //   viewport
      // -----------
      // |   []    |
      // | canvas  |
      // -----------
      //
      // So we need to set the vantage height equal to the height of the
      // thing it is meant to contain, and scale the x dimension (width)
      // with the same aspect ratio.
      //
      // But we have another problem. We need to actually know the dimensions
      // of this left over space, and we need to include the padding (which is
      // a percentage of the _viewport_, not the iamge/canvas).
      //
      // The arithemtic is simple, but it doesn't look very nice in code and
      // is confused by being a part of the aspect ratio scaling. The weird
      // percent math in the primary dimension (in this case the width),
      // is a cross multiplication of the percent of the viewport that
      // the boundingBox is supposed to occupy.
      //
      // For example, if the canvas is 250 coordinate units tall, and our
      // given padding is 5% of the viewport, then, first of all, the
      // canvas height is going to be 90% of the viewport height (subtract
      // both top and bottom marigns of 5%). Then:
      //
      //    90/100 = 250/vantageHeight <--- (we want to know what v.h. is)
      //
      // Cross multiply, giving:
      //
      //    vantageHeight = 250*100/90
      //
      // or, more generally, the real calculation below:

      vantageHeight = boundingBox.height * 100 / (100 - minimumViewportPadding * 2);
      vantageWidth = vantageHeight * viewport.paddedAspectRatio;
      // The remaining dimension bears the same ratio to the primary dimension
      // that the corresponding side of the viewport does to its remaining side,
      // hence the aspectRatio (w/h). For width we multiply, as above, for
      // the height we divide, as below.
    } else {
        vantageWidth = boundingBox.width * 100 / (100 - minimumViewportPadding * 2);
        vantageHeight = vantageWidth / viewport.paddedAspectRatio;
      }

    horizontalMargin = (vantageWidth - boundingBox.width) / 2;
    verticalMargin = (vantageHeight - boundingBox.height) / 2;

    // This returned data is the representation of the viewport in
    // the coordinate system of the images and overlays (the "world")
    // coordinates. OSD, D3, or other rendering environments can use this
    // to position the camera.
    var vantage = {
      x: boundingBox.x - horizontalMargin,
      y: boundingBox.y - verticalMargin,
      width: vantageWidth,
      height: vantageHeight,
      topMargin: verticalMargin,
      bottomMargin: verticalMargin,
      leftMargin: horizontalMargin,
      rightMargin: horizontalMargin
    };

    return padVantage(vantage);
  }

  function padVantage(vantage) {
    // These are "ratios" because they are given as a percent of the viewport.
    var horizontalPaddingRatio = viewport.padding.left + viewport.padding.right;
    var verticalPaddingRatio = viewport.padding.top + viewport.padding.bottom;

    var paddedVantageWidth = vantage.width * 100 / (100 - horizontalPaddingRatio);
    var paddedVantageHeight = vantage.height * 100 / (100 - verticalPaddingRatio);

    var paddedVantage = {
      x: vantage.x - paddedVantageWidth * (viewport.padding.left / 100),
      y: vantage.y - paddedVantageHeight * (viewport.padding.top / 100),
      width: paddedVantageWidth,
      height: paddedVantageHeight,
      topMargin: vantage.topMargin + paddedVantageHeight * viewport.padding.top / 100,
      bottomMargin: vantage.bottomMargin + paddedVantageHeight * viewport.padding.bottom / 100,
      leftMargin: vantage.leftMargin + paddedVantageWidth * (viewport.padding.left / 100),
      rightMargin: vantage.rightMargin + paddedVantageWidth * (viewport.padding.right / 100)
    };

    return paddedVantage;
  }

  function getFacingCanvas(canvas, frames) {
    var selectedIndex;

    frames.forEach(function (frame, index) {
      if (frame.canvas.id === canvas.id) {
        selectedIndex = index;
      }
    });

    if (selectedIndex === 0) {
      return canvas.id;
    } else if (selectedIndex === frames.length - 1) {
      return frames[selectedIndex].canvas;
    } else if ((selectedIndex + 1) % 2 === 0) {
      return frames[selectedIndex + 1].canvas;
    } else {
      return frames[selectedIndex - 1].canvas;
    }
  }

  return {
    overview: overviewLayout,
    intermediate: intermediateLayout,
    detail: detailLayout,
    viewport: viewport
  };
};

module.exports = manifestLayout;