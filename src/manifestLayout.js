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
      containerPadding = {
        top: options.topPadding || 0,
        bottom: options.topPadding || 0,
        left: options.topPadding || 0,
        right: options.topPadding || 0
      },
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
      selectedCanvas = options.selectedCanvas || getFirst(),
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
      viewport = {
        margins: {},
        overviewPadding: {},
        detailPadding: {},
        width: containerWidth,
        height: containerHeight,
        aspectRatio: containerWidth/containerHeight
      };

  function getFirst() {
    return canvases[0]['@id'];
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
      return canvases.map(function(canvas){
        return frame(canvas, framePadding);
      });
    } else {
      return canvases.map(function(canvas){
        return frame(canvas, framePadding);
      });
    }
  }

  function fixedHeightAlign(frames, lineWidth, viewingDirection, viewingMode) {
    var lines = [];

    lines.currentLine = 0;

    lines.addLine = function() {
      var line = lines[lines.currentLine] = [];
      line.remaining = lineWidth;

      return line;
    };

    /**
     * @param frame
     * @returns {Array} [frame x position, line frame is on]
     */
    lines.addItem = function(frame) {
      var line = this[this.currentLine],
          lineItemWidth,
          x;

      if (viewingMode === 'paged') {        
        var position = frame.canvas.sequencePosition;
        // Return the facingFrame, based on the facing page type
        var facingFrame = frames.filter(function(page) {
          var value;
          switch (facingPageType(position)) {
            case 'rightPage':
            value = -1;
            break;
            case 'leftPage':
            value = 1;
            break;
          }
          return page.canvas.sequencePosition + value === position;
        })[0];

        if (facingFrame) {
          lineItemWidth = frame.width + facingFrame.width;
        } else {
          lineItemWidth = frame.width;
        }
      } else {
        lineItemWidth = frame.width;
      }

      if (!line) { line = this.addLine(); }

      if (line.remaining >= lineItemWidth) {
        x = lineWidth - line.remaining;
        if (viewingDirection === 'right-to-left') {
          x = line.remaining - frame.x;
        }
        line.remaining -= frame.width;
        return [x, lines.currentLine];
      }
      if (line.remaining >= frame.width && facingPageType(frame.canvas.sequencePosition) === 'rightPage') {
        x = lineWidth - line.remaining;
        return [x, lines.currentLine];
      }
      this.currentLine += 1;
      line = lines.addLine();
      x = viewingDirection === 'right-to-left' ? frame.width: line.remaining;
      line.remaining -= frame.width;
      return [lineWidth - x, this.currentLine];
    };

    return frames.map(function(frame) {
      var lineStats = lines.addItem(frame);
      frame.x = lineStats[0];
      frame.y = lineStats[1]*frame.height;
      frame.canvas.x = frame.x + frame.canvas.localX;
      frame.canvas.y = frame.y + frame.canvas.localY;
      return frame;
    });
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

  function overviewLayout() {
    // configure for viewingDirection, viewingMode, framing technique,
    // and alignment Style.
    var frames = bindCanvases(canvases.map(pruneCanvas).map(function(canvas) {
      // resizes canvases for the chosen layout strategy.
      return fitHeight(canvas, canvasHeight);
    }), viewingMode, viewingDirection, framePadding, facingCanvasPadding);

    return fixedHeightAlign(frames, containerWidth, viewingDirection, viewingMode);
  }

  function intermediateLayout() {
    // configure for viewingDirection, viewingMode,
    // and alignment Style (scaling).
    return intermediateLayoutHorizontal(overviewLayout(), selectedCanvas, viewport);
  }

  function detailLayout() {
    // TODO: configure for viewingDirection, viewingMode,
    // and alignment Style (scaling).
    // return detailLayoutHorizontal(overviewLayout(), selectedCanvas, viewport);

    return detailLayoutHorizontal(intermediateLayout());
  }

  /**
   * Calculates a vantage for a selected canvas
   * @param {Object} selectedCanvas
   * @param {Object} previousFrame
   * @param {Object} nextFrame
   */
  function getVantageForCanvas(selectedCanvas, previousFrame, nextFrame) {
    var portrait,
        vantageWidth,
        vantageHeight,
        horizontalMargin,
        verticalMargin,
        combinedCanvasWidths,
        x,
        minimumViewportPadding = 5, // units in %
        selectionBoundingBox = {};

    var paddingCalc = ((minimumViewportPadding * 2 ) / 100 );

    // Set the selectionBoundingBox.width, portrait, and x values based on the
    // location of the paged frame
    if (viewingMode === 'paged') {
      var selectionIndex = selectedCanvas.sequencePosition;
      if (selectionIndex === 0) {
        // first page
        combinedCanvasWidths = selectedCanvas.width * 2;
        x = selectedCanvas.x - selectedCanvas.width;
      } else if (selectionIndex % 2 === 0) {
        // right page
        combinedCanvasWidths = selectedCanvas.width + previousFrame.canvas.width;
        x = previousFrame.canvas.x;
      } else {
        // left page
        combinedCanvasWidths = selectedCanvas.width + nextFrame.canvas.width;        
        x = selectedCanvas.x;
      }
    } else {
      combinedCanvasWidths = selectedCanvas.width;
      x = selectedCanvas.x;
    }
    selectionBoundingBox = {
      width: combinedCanvasWidths + (combinedCanvasWidths * paddingCalc),
      height: selectedCanvas.height + (selectedCanvas.height * paddingCalc)
    };

    portrait = isPortrait(selectionBoundingBox.width / selectedCanvas.height);
    if ((viewport.aspectRatio <= 1 && portrait) || (viewport.aspectRatio > 1 && !portrait)) {
      // this handles the case where both the viewport
      // and the canvas are portraits or both landscapes.
      // In this case, "something's gotta give", and
      // more padding will be added to the vantage
      // (which is the same thing as an osd "Bounds" Rect)
      // in order to properly display it.
      if (portrait) {
        vantageWidth = selectionBoundingBox.width;
        vantageHeight = vantageWidth / viewport.aspectRatio;
      } else {
        vantageHeight = selectionBoundingBox.height;
        vantageWidth = vantageHeight * viewport.aspectRatio;
      }
    } else {
      // note here that we've already eliminated the cases
      // where the viewport is the same aspect ratio class
      // as the canvas.
      if (portrait) {
        vantageHeight = selectionBoundingBox.height;
        vantageWidth = vantageHeight * viewport.aspectRatio;
      } else {
        vantageWidth = selectionBoundingBox.width;
        vantageHeight = vantageWidth / viewport.aspectRatio;
      }
    }
    horizontalMargin = (vantageWidth - combinedCanvasWidths) / 2;
    verticalMargin = (vantageHeight - selectedCanvas.height) / 2;

    return {
      x: x - horizontalMargin,
      y: selectedCanvas.y - verticalMargin,
      width: vantageWidth,
      height: vantageHeight,
      horizontalMargin: horizontalMargin,
      verticalMargin: verticalMargin
    };
  }

  function detailLayoutHorizontal(frames) {
    var selectedFrame = frames.filter(function(frame) {
      return frame.canvas.selected;
    })[0],
        previousFrames = frames.filter(function(frame, index){
          return index < selectedFrame.canvas.sequencePosition;
        }).reduce(function(sum, nextFrame) {
          frame.y = selectedFrame.y;
          return sum + nextFrame.width;
        }, selectedFrame.vantage.width),
        nextFrames = frames.filter(function(frame, index){
          return index < selectedFrame.canvas.sequencePosition;
        }).reduce(function(sum, nextFrame) {
          return sum + nextFrame.width;
        }, selectedFrame.vantage.width);

    frames.forEach(function(frame, index) {
      if(index < selectedFrame.canvas.sequencePosition){
        frame.x = '' - leftDisplacement;
      } else {
        frame.x = '' + rightDisplacement;
      }
      frame.y = selectedFrame.y;
    });

    return frames;
  }

  function intermediateLayoutHorizontal(frames, selectedCanvas, viewport) {
    var selectedFrame = frames.filter(function(frame) {
      return frame.canvas.selected;
    })[0];

    var canvasPosition = selectedFrame.canvas.sequencePosition;
    var previousFrame = frames[canvasPosition - 1];
    var nextFrame = frames[canvasPosition + 1];

    selectedFrame.vantage = getVantageForCanvas(selectedFrame.canvas, previousFrame, nextFrame, viewport);
    
    frames.forEach(function(frame, index, allFrames) {
      if (frame.y === selectedFrame.y && frame.canvas.id !== selectedFrame.canvas.id) {
        if (index < canvasPosition) {
          frame.x = frame.x - selectedFrame.vantage.horizontalMargin;
        } else {
          frame.x = frame.x + selectedFrame.vantage.horizontalMargin;
        }
      } else if (frame.y > selectedFrame.y) {
        frame.y = frame.y + selectedFrame.vantage.verticalMargin;
      } else if (frame.y < selectedFrame.y) {
        frame.y = frame.y - selectedFrame.vantage.verticalMargin;
      }

      frame.canvas.x = frame.x + frame.canvas.localX;
      frame.canvas.y = frame.y + frame.canvas.localY;
    });

    // Now that I have the select frame, I need to determine the three groups
    // of objects to transform. Those of the same line, those above, and those below.

    return frames;
  }

  /**
   * Calculates whether or not an aspectRatio is portrait
   * @param {Number} aspectRatio (w/h)
   * @returns {Boolean}
   */
  function isPortrait(aspectRatio) {
    return aspectRatio <= 1 ? true : false;
  }


  function detailLayoutVertical(frames, selected, viewport) {
    return frames.map();
  }

  function indicesOfParentLine(selectedCanvas) {
  };

  function intermediateLayoutVertical(frames, selected, viewport) {
    return frames.map();
  }

  return {
    overview: overviewLayout,
    intermediate: intermediateLayout,
    detail: detailLayout
  };

};

module.exports = manifestLayout;
