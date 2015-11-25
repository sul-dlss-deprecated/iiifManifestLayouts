'use strict';

var manifestLayout = function(options) {
  var maxCanvasHeight = options.maxCanvasHeight || 130, // screen pixels
      maxCanvasWidth = options.maxCanvasWidth ||  30, // screen pixels
      minCanvasWidth = options.minCanvasWidth ||  30,  // screen pixels
      minCanvasHeight = options.minCanvasHeight ||  30,  // screen pixels
      canvasHeight = options.canvasHeight * options.scaleFactor ||  100,  // screen pixels
      canvasWidth = options.canvasWidth * options.scaleFactor ||  30,  // screen pixels
      scaleFactor = options.scaleFactor || 1,
      columns = options.columns || 8,
      framePadding = {
        top: options.framePadding.top || 0,
        bottom: options.framePadding.bottom || 0,
        left: options.framePadding.left || 0,
        right: options.framePadding.right || 0
      },
      facingCanvasPadding = options.facingCanvasPadding,  // screen pixels
      minimumImageGap = options.minimumImageGap,
      viewportPadding,     // screen pixels
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
      viewport = viewport(containerWidth, containerHeight, options.viewportPadding);

  function viewport(width, height, viewportPadding) {
    var horizontalMargin,
        verticalMargin;

    var viewport = {
      padding: viewportPadding || {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0 // units in % of pixel height of viewport
      },
      width: width,
      height: height,
      aspectRatio: width/height
    };

    horizontalMargin = (viewport.padding.left + viewport.padding.right);
    verticalMargin = (viewport.padding.top + viewport.padding.bottom);

    viewport.paddedWidth = width - width*(horizontalMargin/100);
    viewport.paddedHeight = height - height*(verticalMargin/100);
    viewport.paddedAspectRatio = viewport.paddedWidth/viewport.paddedHeight;

    return viewport;
  }

  function pruneCanvas(canvas, index) {
    var prunedCanvas = {
      id: canvas['@id'],
      label: canvas.label,
      height: canvas.height,
      width: canvas.width,
      aspectRatio: canvas.width/canvas.height,
      thumbService: canvas.images[0].resource.service['@id'],
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
        widthScaleFactor = canvasWidth/canvas.width,
        heightScaleFactor = canvasHeight/canvas.height;

    if (portrait) {
      fitHeight(canvas, canvasHeight);
    } else {
      fitWidth(canvas, canvasWidth);
    }

    return canvas;
  }

  function fitHeight(canvas, canvasHeight) {
    var portrait = canvas.aspectRatio <= 1.0 ? true : false,
        scaleFactor = canvasHeight/canvas.height;

    canvas.height = canvasHeight;
    // we forced the height to fit, so the width
    // must be scaled according to the height.
    canvas.width = canvas.width*scaleFactor;

    return canvas;
  }

  function fitWidth(canvas, canvasWidth) {
    var portrait = canvas.aspectRatio <= 1.0 ? true : false,
        scaleFactor = canvasHeight/canvas.width;

    canvas.width = canvasWidth;
    // we forced the width to fit, so the height
    // must be scaled according to the width.
    canvas.height = canvas.height*scaleFactor;

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
    var framesPerLine = Math.floor(lineWidth/canvasWidth),
        framesLength = frames.length;

    return frames.map(function(frame, index) {
      var lineNumber = Math.floor((index)/framesPerLine),
          lineIndex = index%framesPerLine;
      // The canvass must get their x and y properties
      // after the frame (the parent) props are set.
      frame.x = frame.width*lineIndex;
      frame.y = lineNumber*frame.height; // y determined by the line;

      frame.canvases.forEach(function(canvas, index) {
        canvas.localX = frame.leftPadding,
        canvas.localY = frame.topPadding,
        canvas.x = frame.x + frame.leftPadding,
        canvas.y = frame.y + frame.topPadding;
      });

      return frame;
    });
  }

  function bindCanvases(canvases, viewingMode, viewingDirection, framePadding, facingCanvasPadding) {

    if (viewingMode === 'paged') {
      return canvases.filter(function(canvas) {
        return canvas.viewingHint === 'non-paged' ? false : true;
      }).map(function(canvas, index) {
        var boundPagePadding;

        if (index === 0) {
          boundPagePadding = {
            top: framePadding.top,
            bottom: framePadding.bottom,
            left: framePadding.left,
            right: canvas.width * facingCanvasPadding/100/2
          };
          boundPagePadding.left = canvas.width + (facingCanvasPadding/100 * canvas.width);
          return frame(canvas, boundPagePadding);
        } else if ((index + 1) % 2 === 0) {
          // gets all even pages and makes
          // their facing page the next page
          // in the index.
          boundPagePadding = {
            top: framePadding.top,
            bottom: framePadding.bottom,
            left: framePadding.left,
            right: canvas.width * facingCanvasPadding/100/2
          };

          return frame(canvas, boundPagePadding);

        } else {

          boundPagePadding = {
            top: framePadding.top,
            bottom: framePadding.bottom,
            left: canvas.width * facingCanvasPadding/100/2,
            right: framePadding.right
          };

          return frame(canvas, boundPagePadding);
        }
      });
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
      return canvases.map(function(canvas){
        return frame(canvas, boundPagePadding);
      });
    } else {
      return canvases.map(function(canvas){
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
    } else if ((index % 2) === 0) {
      return 'rightPage';
    } else {
      return 'leftPage';
    }
  }

  function hasFacingCanvas(position) {
    var facingCanvases = canvases.filter(function(page) {
      var value;
      switch (facingPageType(position)) {
        case 'rightPage':
        value = -1;
        break;
      case 'leftPage':
        value = 1;
        break;
      case 'firstPage':
        value = 0;
        break;
      }
      return page.sequencePosition + value === position;
    });
    return facingCanvases.length !== 0;
  }

  var Lines = function(lineWidth){
    this.currentLine = 0;
    this.lineWidth = lineWidth;
  }

  Lines.prototype = {
    addLine: function() {
      var line = this[this.currentLine] = [];
      line.remaining = this.lineWidth;

      return line;
    },

    /**
     * @param frame
     * @returns {Array} [frame x position, line frame is on]
     */
    addItem: function(frame) {
      var line = this[this.currentLine],
          lineItemWidth,
          x;

      lineItemWidth = frame.width;
      if (viewingMode === 'paged' && hasFacingCanvas(frame.canvas.sequencePosition)) {
        lineItemWidth = frame.width + facingFrame.width;
      }

      if (!line) { line = this.addLine(); }

      if (line.remaining >= lineItemWidth) {
        x = this.lineWidth - line.remaining;
        if (viewingDirection === 'right-to-left') {
          x = line.remaining - frame.x;
        }
        line.remaining -= frame.width;
        return [x, this.currentLine];
      }
      if (line.remaining >= frame.width && facingPageType(frame.canvas.sequencePosition) === 'rightPage') {
        x = this.lineWidth - line.remaining;
        return [x, this.currentLine];
      }
      this.currentLine += 1;
      line = this.addLine();
      x = viewingDirection === 'right-to-left' ? frame.width: line.remaining;
      line.remaining -= frame.width;
      return [this.lineWidth - x, this.currentLine];
    }
  }

  function fixedHeightAlign(frames, lineWidth) {
    var lines = new Lines(lineWidth);

    return frames.map(function(frame) {
      var lineStats = lines.addItem(frame);
      frame.x = lineStats[0];
      frame.y = lineStats[1]*frame.height;
      frame.canvas.x = frame.x + frame.canvas.localX;
      frame.canvas.y = frame.y + frame.canvas.localY;
      return frame;
    });
  }

  function overviewLayout() {
    // configure for viewingDirection, viewingMode, framing technique,
    // and alignment Style.
    var frames = bindCanvases(canvases.map(pruneCanvas).map(function(canvas) {
      // resizes canvases for the chosen layout strategy.
      return fitHeight(canvas, canvasHeight);
    }), viewingMode, viewingDirection, framePadding, facingCanvasPadding);

    return fixedHeightAlign(frames, viewport.paddedWidth)
      .map(function(frame){
        frame.x += viewport.width*viewport.padding.left/100;
        frame.y += viewport.height*viewport.padding.top/100;
        frame.canvas.x = frame.x + frame.canvas.localX;
        frame.canvas.y = frame.y + frame.canvas.localY;
        return frame;
      });
  }

  function detailLayout() {
    return detailLayoutHorizontal();
  }

    function detailLayoutHorizontal() {
    // configure for viewingDirection, viewingMode, framing technique,
    // and alignment Style.
    var frames = bindCanvases(canvases.map(pruneCanvas).map(function(canvas) {
      // resizes canvases for the chosen layout strategy.
      return fitHeight(canvas, canvasHeight);
    }), viewingMode, viewingDirection, framePadding, facingCanvasPadding);

    return fixedHeightAlign(frames, viewport.paddedWidth)
      .map(function(frame){
        frame.x += viewport.width*viewport.padding.left/100;
        frame.y += viewport.height*viewport.padding.top/100;
        frame.canvas.x = frame.x + frame.canvas.localX;
        frame.canvas.y = frame.y + frame.canvas.localY;
        return frame;
      });
  }

  function detailLayoutVertical(frames, selected, viewport) {
    return frames.map();
  }

  function intermediateLayout() {
    // configure for viewingDirection, viewingMode,
    // and alignment Style (scaling).
    return intermediateLayoutHorizontal(overviewLayout(), selectedCanvas, viewport);
  }

  function intermediateLayoutVertical(frames, selected, viewport) {
    return frames.map();
  }

  function intermediateLayoutHorizontal(frames, selectedCanvas, viewport) {
    var selectedFrame = frames.filter(function(frame) {
      return frame.canvas.selected;
    })[0],
        facingCanvas = getFacingCanvas(selectedFrame.canvas, frames);

    var canvasPosition = selectedFrame.canvas.sequencePosition;

    selectedFrame.vantage = getVantageForCanvas(selectedFrame.canvas, facingCanvas, viewport);

    if (viewingMode !== 'continuous') {
      frames.forEach(function(frame, index, allFrames) {
        if (frame.y === selectedFrame.y && frame.canvas.id !== selectedFrame.canvas.id) {
          if (viewingMode === 'paged' && frame.canvas.id === facingCanvas.id) {
            return;
          }
          // These are the canvases within the same line of the overview layout.
          if (index < canvasPosition) {
            // Those to the left. Push them to the left, out of frame.
            frame.x = frame.x - (selectedFrame.vantage.leftMargin + framePadding.right*2);
          } else {
            // Those to the right. Push them to the right, out of frame.
            frame.x = frame.x + (selectedFrame.vantage.rightMargin + framePadding.left*2);
          }
        } else if (frame.y > selectedFrame.y) {
          // These are all the canvases below the selected canvas
          // in the overview layout. Push then down out of frame.
          frame.y = frame.y + (selectedFrame.vantage.topMargin + framePadding.bottom*2);
        } else if (frame.y < selectedFrame.y) {
          // These are all the canvases above the selected canvas
          // in the overview layout. Push them up out of frame.
          frame.y = frame.y - (selectedFrame.vantage.bottomMargin + framePadding.top*2);
        }

        frame.canvas.x = frame.x + frame.canvas.localX;
        frame.canvas.y = frame.y + frame.canvas.localY;
      });
    }
    return frames;
  }


  /**
   * Calculates a vantage for a selected canvas
   * @param {Object} selectedCanvas
   * @param {Object} previousFrame
   * @param {Object} nextFrame
   */
  function getVantageForCanvas(selectedCanvas, facingCanvas, viewport) {
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
        combinedCanvasWidths += ((facingCanvasPadding/100) * combinedCanvasWidths);
        x = facingCanvas.x;
        pairHeight = Math.max(selectedCanvas.height, facingCanvas.height);
      } else {
        // left page
        combinedCanvasWidths = selectedCanvas.width + facingCanvas.width;
        combinedCanvasWidths += ((facingCanvasPadding/100) * combinedCanvasWidths);
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

    return getVantage(selectionBoundingBox, viewport);
  }

  /**
   * Calculates a vantage for a given bounding box.
   * @param {Object} boundingBox
   *     The bounding box can be from anywhere.
   *     In our case we want it to contain a canvas
   *     or a group of canvases.
   * @param {Object} viewport
   */
  function getVantage(boundingBox, viewport) {
    var boundingBoxAspectRatio = boundingBox.width / boundingBox.height,
        vantageWidth,
        vantageHeight,
        horizontalMargin,
        verticalMargin,
        minimumViewportPadding = 5; // units in % of the _viewport_ width/height.
                                    // (as the case may be)
 if ((viewport.paddedAspectRatio >= boundingBoxAspectRatio)) {
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

      vantageHeight = (boundingBox.height*100)/(100-minimumViewportPadding*2);
      vantageWidth = vantageHeight * viewport.paddedAspectRatio;
      // The remaining dimension bears the same ratio to the primary dimension
      // that the corresponding side of the viewport does to its remaining side,
      // hence the aspectRatio (w/h). For width we multiply, as above, for
      // the height we divide, as below.
    } else {
      vantageWidth = (boundingBox.width*100)/(100-minimumViewportPadding*2);
      vantageHeight = vantageWidth / viewport.paddedAspectRatio;
    }

    horizontalMargin = (vantageWidth - boundingBox.width) / 2;
    verticalMargin = (vantageHeight - boundingBox.height) / 2;

    // This returned data is the representation of the viewport in
    // the coordinate system of the images and overlays (the "world")
    // coordinates. OSD/D3, other rendering environments can use this
    // to position the camera.
    var vantage = {
      x: boundingBox.x - horizontalMargin,
      y: boundingBox.y - verticalMargin,
      width: vantageWidth,
      height: vantageHeight,
      topMargin: verticalMargin,
      bottomMargin: verticalMargin,
      leftMargin: horizontalMargin,
      rightMargin:horizontalMargin
    };

    return padVantage(vantage, viewport);
  }

  function padVantage(vantage, viewport) {
    var horizontalPaddingRatio = viewport.padding.left + viewport.padding.right;
    var verticalPaddingRatio = viewport.padding.top + viewport.padding.bottom;

    var paddedVantageWidth = (vantage.width*100)/(100-horizontalPaddingRatio);
    var paddedVantageHeight = (vantage.height*100)/(100-verticalPaddingRatio);

    var paddedVantage = {
      x: vantage.x - (paddedVantageWidth*(viewport.padding.left/100)),
      y: vantage.y - (paddedVantageHeight*(viewport.padding.top/100)),
      width: paddedVantageWidth,
      height: paddedVantageHeight,
      topMargin: vantage.topMargin + (paddedVantageHeight*viewport.padding.top)/100,
      bottomMargin: vantage.bottomMargin + (paddedVantageHeight*viewport.padding.bottom)/100,
      leftMargin: vantage.leftMargin + (paddedVantageWidth*(viewport.padding.left/100)),
      rightMargin:vantage.rightMargin + (paddedVantageWidth*(viewport.padding.right/100))
    };

    return paddedVantage;
  }

  function getBoundingBoxForCanvases(selectedCanvases) {
  }

  function getFacingCanvas(canvas, frames) {
    var selectedIndex;

    frames.forEach(function(frame, index) {
      if (frame.canvas.id === canvas.id) {
        selectedIndex = index;
      }
    });

    if (selectedIndex === 0) {
      return canvas.id;
    } else if (selectedIndex === frames.length - 1) {
      return frames[selectedIndex].canvas;
    } else if ((selectedIndex + 1) % 2 === 0) {
      return frames[selectedIndex+1].canvas;
    } else {
      return frames[selectedIndex-1].canvas;
    }
  }

  function indicesOfParentLine(selectedCanvas) {
  };


  return {
    overview: overviewLayout,
    intermediate: intermediateLayout,
    detail: detailLayout
  };

};

module.exports = manifestLayout;
