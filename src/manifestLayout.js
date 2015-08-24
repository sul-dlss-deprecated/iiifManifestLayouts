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
        facingCanvasPadding,  // screen pixels
        viewportPadding,     // screen pixels
        containerHeight = options.height,
        containerWidth = options.width,
        canvases = options.canvases,
        selectedCanvas = options.selectedCanvas || getFirst(),
        framingStrategy = options.framingStrategy || 'contain',
        viewingDirection = options.viewingDirection || 'left-to-right',
        viewingHint = options.viewingHint || null,
        lineStrategy = options.viewingHint || 'grid',
        minimumImageGap = options.minimumImageGap,

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

    function bindPages(frames, viewingHint, viewingDirection, facingCanvasPadding) {
        if (viewingHint === 'paged') {
            return frames.filter(function(frame) {
                return frame.canvas.viewingHint === 'non-paged' ? false : true;
            }).map(function(frame, index) {
                if (index === 0) {
                    return frame;
                }

                if ((index + 1) % 2 === 0) {
                    // gets all even pages and makes
                    // their facing page the next page
                    // in the index.
                    return frame;

                    // only return the bound frames.
                    // opensedragon needs the particular page data,
                    // so the inside of each canvas is updated.
                } else {
                    return frame;
                }
            });
        } else if (viewingHint === 'continuous') {
            return frames;
        } else {
            return frames;
        }
    }

    function fixedHeightAlign(frames, lineWidth, viewingDirection) {
        var lines = [];


        lines.currentLine = 0;

        lines.addLine = function() {
            var line = lines[lines.currentLine] = [];
            line.remaining = lineWidth;

            return line;
        };

        lines.addItem = function(frame) {
            var line = this[this.currentLine];

            if (!line) { line = this.addLine(); }

            if (line.remaining >= frame.width) {
                var x = lineWidth - line.remaining;
                if (viewingDirection === 'right-to-left') {
                    x = line.remaining - frame.width;
                };
                line.remaining -= frame.width;
                return [x, lines.currentLine];
            }

            this.currentLine += 1;
            line = lines.addLine();
            x = viewingDirection === 'right-to-left' ? frame.width : line.remaining;
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

    function overviewLayout() {
        // configure for viewingDirection, viewingHint, framing technique,
        // and alignment Style.
        var frames = canvases.map(pruneCanvas).map(function(canvas) {
            return frame(fitHeight(canvas, canvasHeight), framePadding);
        });

        return fixedHeightAlign(frames, containerWidth, viewingDirection);
    }

    function intermediateLayout() {
        // configure for viewingDirection, viewingHint,
        // and alignment Style (scaling).
        return intermediateLayoutHorizontal(overviewLayout(), selectedCanvas, viewport);
    }

    function detailLayout() {
        // TODO: configure for viewingDirection, viewingHint,
        // and alignment Style (scaling).
        // return detailLayoutHorizontal(overviewLayout(), selectedCanvas, viewport);

        return detailLayoutHorizontal(intermediateLayout());
    }

    function getVantageForCanvas(canvas, viewport) {
        var portrait = (canvas.width/canvas.height) <= 1,
            vantageWidth,
            vantageHeight,
            horizontalMargin,
            verticalMargin,
            minimumViewportPadding = 5, // units in %
            selectionBoundingBox;

        if (viewingHint === 'paged') {
            // If we're in book mode, the vantage needs
            // to take into account the matching page
            // as well as the configured page margin.
            selectionBoundingBox = {width: canvas.width};
        }

        selectionBoundingBox = {
            width: canvas.width + (canvasWidth*(minimumViewportPadding*2)/100),
            height: canvas.height + (canvas.height*(minimumViewportPadding*2)/100)
        };

        if (viewport.aspectRatio <= 1 && portrait || viewport.aspectRatio > 1 && !portrait) {
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
                vantageWidth = selectionBoundingBox.width,
                vantageHeight = vantageWidth / viewport.aspectRatio;
            }
        }

        horizontalMargin = (vantageWidth - canvas.width)/2,
        verticalMargin = (vantageHeight - canvas.height)/2;

        return {
            x: canvas.x - horizontalMargin,
            y: canvas.y - verticalMargin,
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
        selectedFrame.vantage = getVantageForCanvas(selectedFrame.canvas, viewport);

        frames.forEach(function(frame, index, allFrames) {
            if (frame.y === selectedFrame.y && frame.canvas.id !== selectedFrame.canvas.id) {
                if (index < selectedFrame.canvas.sequencePosition) {
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
