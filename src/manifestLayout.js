'use strict';

var manifestLayout = function(options) {
    var maxCanvasHeight = options.maxCanvasHeight || 130, // screen pixels
        maxCanvasWidth = options.maxCanvasWidth ||  30, // screen pixels
        minCanvasWidth = options.minCanvasWidth ||  30,  // screen pixels
        minCanvasHeight = options.minCanvasHeight ||  30,  // screen pixels
        canvasHeight = options.canvasHeight ||  100,  // screen pixels
        canvasWidth = options.canvasWidth ||  30,  // screen pixels
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
            height: containerHeight
        };

    function getFirst() {
        return canvases[0]['@id'];
    }

    function pruneCanvas(canvas) {
        var prunedCanvas = {
            id: canvas['@id'],
            label: canvas.label,
            height: canvas.height,
            width: canvas.width,
            aspectRatio: canvas.width/canvas.height,
            thumbService: canvas.images[0].resource.service['@id'],
            selected: canvas['@id'] === selectedCanvas ? true : false
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
            frames.filter(function(frame) {
                return frame.viewingHint === 'non-paged' ? false : true;
            });
            // TODO: perhaps change the ordering based on viewingDirection
        }

        return frames.map(function(frame, index, frames) {
            if ((index + 1) % 2 === 0) {
                // gets all even pages and makes
                // their facing page the next page
                // in the index.

                // only return the bound frames.
                // opensedragon needs the particular page data,
                // so the inside of each canvas is updated.
            }
            return frame;
        });
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

    function group(frames, selected) {

        var focusIndex = frames.indexOf(selected),
            lineStart = function(focus) {
                // we need only iterate in one direction.
                // Binary search not appropriate; use an
                // exponential backoff instead.

                frames.slice(focusIndex - 10, focusIndex).forEach(function() {
                });
                return 'int';
            },
            lineEnd = function(focus) {
                // we need only iterate in one direction.
                // frames.
                return 'int';
            };

        // Conduct binary search on either side of the
        // selected canvas. Store the stopcodes as
        // resultant indices.

        return {
            // Map over the frames using the stopcodes.
            // Do benchmark on 4 loops versus .reduce()?
            // Can this be done with a reduce?
            left: [],
            right: [],
            above: [],
            below: []
        };
    }

    function intermediateLayout() {
        // configure for viewingDirection, viewingHint,
        // and alignment Style (scaling).
    }

    function detailLayout() {
        // configure for viewingDirection, viewingHint,
        // and alignment Style (scaling).
        return detailLayoutHorizontal(overviewLayout(), selectedCanvas, [containerWidth, containerHeight]);
    }

    function overviewLayout() {
        // configure for viewingDirection, viewingHint, framing technique,
        // and alignment Style.
        var frames = canvases.map(pruneCanvas).map(function(canvas) {
            return frame(fitHeight(canvas, canvasHeight), framePadding);
        });

        return fixedHeightAlign(frames, containerWidth, viewingDirection);
    }

    function getDetailFrame(canvas, viewport) {
    }

    function detailLayoutHorizontal(frames, selected, viewport) {
        // builds a viewbox (bounds) for each of the items, and
        // updates their positions so that when they are panned
        // to, the "camera" moves along the reading direction.
        var currentCanvas = '',
            previousCanvases = '',
            nextCanvases = '';

        return detailFrames.map(function(frame) {
            // 1.) Find the current canvas and increase the frame
            // paddings to match the target viewport.
            return frame;
        });
    }

    function detailLayoutVertical(frames, selected, viewport) {
        return frames.map();
    }

    function indicesOfParentLine(selectedCanvas) {
    };

    function intermediateLayoutVertical(frames, selected, viewport) {
        return frames.map();
    }

    function intermediateLayoutHorizontal(frames, selected, viewport) {
        return frames.map();
    }

    // Book
    // - Recalculate using the pairs for lineBreaking and diminishing the margins between pairs
    // - Verticality matters. Only shrink the margins in the correct direction.

    // Continuous
    // - Reduce all margins (in the correct direction) to 0.
    // - What is the "correct direction"? It depends on the reading direction. If
    //   the reading direction is vertical, the pages should be ordered in columns
    //   anyway (different layout altogether). If vertical, only shrink the top and
    //   bottom margins to 0. Otherwise, shrink the horizontal margins and repeat the
    //   layout.

    // Left-to-right Intermediate (Smoothly animate translations, pan, and zoom simultaneously)
    // - Take the result of the left-to-right layout algorithm and adjust all
    //   frames such that those in the lines above and below the current line
    //   translated up and down respectively by an amount calculated from the
    //   viewport properties. At the end of the transition they should be invisible
    //   to the user.
    // - Take those to the right of the selected image and translate them far to the
    //   right, take those on the left and translate them far left.
    // Left-to-right Focused (This change occurs instantaneously, out of frame (the viewport))
    // - Take all items with lower numbered indices and arrange them to the
    //   left of the current page. Take all items with higher numbered indices
    //   and arrange them to the right of the current page. The margin between
    //   the items will be a function of the viewport size, and a reasonable
    //   buffer to prevent them from appearing on resizing accidentally.

    // Right-to-left Intermediate (Smoothly animate translations, pan, and zoom simultaneously)
    // - Take the result of the right-to-left layout algorithm and adjust all
    //   frames such that those in the lines above and below the current line
    //   translated up and down respectively by an amount calculated from the
    //   viewport properties. At the end of the transition they should be invisible
    //   to the user.
    // Right-to-left Focused (This change occurs instantaneously, out of frame (the viewport))
    // - Take all items with lower numbered indices and arrange them to the
    //   right of the current page. Take all items with higher numbered indices
    //   and arrange them to the left of the current page. The margin between
    //   the items will be a function of the viewport size, and a reasonable
    //   buffer to prevent them from appearing on resizing accidentally.

    // Top-to-bottom Intermediate (Smoothly animate translations, pan, and zoom simultaneously)
    // Top-to-bottom Focused (This change occurs instantaneously, out of frame (the viewport))

    // Bottom-to-top Intermediate (Smoothly animate translations, pan, and zoom simultaneously)
    // Bottom-to-top Focused (This change occurs instantaneously, out of frame (the viewport))

    return {
        overview: overviewLayout,
        intermediate: intermediateLayout,
        detail: detailLayout
    };

};

module.exports = manifestLayout;
