var _ = require('underscore');
var $ = require('jquery');
var d3 = require('d3');

// D3 example
$.get('http://purl.stanford.edu/fw090jw3474/iiif/manifest.json', function(data) {
    renderManifest(data);
});

var manifestLayout = function(options) {
    var maxFrameHeight = options.maxFrameHeight || 130, // screen pixels
        maxFrameWidth = options.maxFrameWidth ||  300, // screen pixels
        minFrameWidth = options.minFrameWidth ||  30,  // screen pixels
        minFrameHeight = options.minFrameHeight ||  30,  // screen pixels
        frameHeight = options.frameHeight ||  30,  // screen pixels
        frameWidth = options.frameWidth ||  30,  // screen pixels
        scaleFactor = options.scaleFactor || 1,
        columns = options.columns || 8,
        containerPadding = {
            top: options.topPadding || 0,
            bottom: options.topPadding || 0,
            left: options.topPadding || 0,
            right: options.topPadding || 0
        },
        vantagePadding = {
            top: options.vantagePadding.top || 0,
            bottom: options.vantagePadding.bottom || 0,
            left: options.vantagePadding.left || 0,
            right: options.vantagePadding.right || 0
        },
        facingCanvasPadding,  // screen pixels
        viewportPadding,     // screen pixels
        containerHeight = options.height,
        containerWidth = options.width,
        canvases = options.canvases,
        framingStrategy = options.framingStrategy || 'contain',
        viewingDirection = options.viewingDirection || 'left-to-right',
        viewingHint = options.viewingHint || null,
        lineStrategy = options.viewingHint || 'grid',

        // Layout Constants
        // Storing strategies for specific states
        framingStrategies = {
            // different ways the canvas
            // will be forced into its frame
            // or be allowed to shape its frame
            contain: contain,
            // fitHeight: fitHeight,
            // fitWidth: fitHeight,
            hybrid: hybrid
        },
        readingDirections = {
            // leftToRight: leftToRight,
            // rightToLeft: rightToLeft //,
            // topToBottom: ...,
            // bottomToTop: ...
        },
        lineStrategies = {
            // fixedWidthColumns: fixedColumnLine,
            // fixedHeightRows: fixedHeightLine,
            grid: gridAlign
        };

    function pruneCanvas(canvas) {
        return {
            id: canvas['@id'],
            label: canvas.label,
            height: canvas.height,
            width: canvas.width,
            aspectRatio: canvas.width/canvas.height
        };
    }

    // The following framingStrategies specify how a canvas fits inside its "frame".
    // A "frame" is an abstract target that the user may click on.
    // #Terminology
    // ##Vantage
    // The hoverable and clickable target area that will fill the viewport if it is clicked.
    // In the case of a book object, a vantage will contain both pages. It contains the
    // "Frame" for the eventual zooming canvas object.
    // ##Frame
    // The frame is an html element that can be styled with properties such as "background color",
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

    function contain(canvas, frameWidth, frameHeight) {
        // The item target is the same regardless of the object inside of it,
        // and the canvas is scaled down on its longest side in order to fit
        // inside of the box. Alternatively, there may be allowed a fixed-size
        // "portrait" or "landscape" view into which the object is scaled
        // depending on its aspect ratio bias.
        var portrait = canvas.aspectRatio <= 1.0 ? true : false,
            widthScaleFactor = frameWidth/canvas.width,
            heightScaleFactor = frameHeight/canvas.height;

        if (portrait) {
            canvas.height = frameHeight;
            // we forced the height to fit, so the width
            // must be scaled according to the height.
            canvas.width = canvas.width*heightScaleFactor;
        } else {
            canvas.width = frameWidth;
            // we forced the width to fit, so the height
            // must be scaled according to the width.
            canvas.height = canvas.height*widthScaleFactor;
        }

        console.log(canvas);
        return canvas;
    }

    function hybrid(canvas, maxFrameWidth, maxFrameHeight) {
        // Fixed height layout with auto-fitting
        // of extremely long or extremeley tall
        // objects into a maximum width.
    }

    function vantage(frames, padding) {
        // A vantage can wrap several book pages
        // into what will become a single higlight,
        // hover, or click target.
        console.log(padding);
        if (frames[1]) {
            return {
                // width: (frames[0].width + frames[1].width)
                //     + padding.left + padding.right + facingCanvasPadding,
                // height: (frames[0].height + frames[1].height)
                //     + padding.top + padding.bottom + facingCanvasPadding,
                // frames: frames
            };
        } else {
            return {
                width: frameWidth + padding.left + padding.right,
                height: frameHeight + padding.top + padding.bottom,
                frames: frames
            };
        }
    }

    function gridAlign(vantages, frameHeight, frameWidth, lineWidth) {
        var vantagesPerLine = Math.floor(lineWidth/frameWidth),
        vantagesLength = vantages.length;

        return vantages.map(function(vantage, index) {
            var lineNumber = Math.floor((index)/vantagesPerLine),
                lineIndex = index%vantagesPerLine;
            // console.log('currentItemWidth: ' + vantage.width);
            // console.log('lineWidth: ' +lineWidth);
            // console.log('total items: ' + vantagesLength);
            // console.log('itemsPerLine: ' + vantagesPerLine);
            // console.log('lineNumber: ' + lineNumber);
            // The frames must get their x and y properties
            // after the vantage (the parent) props are set.
            vantage.x = vantage.width*lineIndex;
            vantage.y = lineNumber*vantage.height; // y determined by the line;

            vantage.frames.forEach(function(frame) {
                frame.localX = vantage.leftPadding,
                frame.localY = vantage.topPadding,
                frame.x = vantage.x + vantage.leftPadding,
                frame.y = vantage.y + vantage.topPadding;
            });

            return vantage;
        });
    }

    function bindPages(vantages, viewingHint, viewingDirection, facingCanvasPadding) {
        if (viewingHint === 'paged') {
            vantages.filter(function(vantage) {
                return vantage.viewingHint === 'non-paged' ? false : true;
            });
            // TODO: perhaps change the ordering based on viewingDirection
        }

        return vantages.map(function(vantage, index, vantages) {
            if ((index + 1) % 2 === 0) {
                // gets all even pages and makes
                // their facing page the next page
                // in the index.

                // only return the bound vantages.
                // opensedragon needs the particular page data,
                // so the inside of each frame is updated.
            }
            return vantage;
        });
    }

    function layout() {
        // Reads the configuration
        // and structures the calculation with
        // the appropriate strategies.

        // Resolve the strategies used for the
        // calculation based on the combination of
        // options. These will all be functions
        // to be run at the appropriate stage
        // of the layout algorithm.
        var frame = framingStrategies[framingStrategy];
        var align = lineStrategies[lineStrategy];

        // Prepare each node's layout parameters
        // before passing them into the line-level
        // functions.
        var vantages = canvases.map(function(canvas) {
            return vantage([frame(pruneCanvas(canvas),
                                  frameWidth,
                                  frameHeight
                                 )],
                           vantagePadding,
                           viewingHint
                          );
        });

        // Take each vantage and mutate it to encompass
        // facing pages, then use options to further
        // mutate their x, y, width, and height coordinates
        // to position them appropriately.
        return align(bindPages(vantages, viewingHint, viewingDirection, facingCanvasPadding),
                     frameHeight,
                     frameWidth,
                     containerWidth,
                     viewingDirection
                    );
    }

    return layout();

};

function renderManifest(manifest) {
    var container = $('#d3-example');

    var layoutData = manifestLayout({
        canvases: manifest.sequences[0].canvases,
        width: container.width(),
        height: container.height(),
        frameHeight: 100,
        frameWidth: 100,
        vantagePadding: {
            top: 0,
            bottom: 50
        }
    });

    // console.log(layoutData);

    var interactionOverlay = d3.select('#d3-example');

    // To understand this layout, read: http://bost.ocks.org/mike/nest/
    var vantages = interactionOverlay.selectAll('.vantage')
            .data(layoutData)
            .enter().append('li')
            .attr('class', 'vantage')
            .style('width', function(d) { return d.width + 'px'; })
            .style('height', function(d) { return d.height + 'px'; })
            .style('transform', function(d) { return 'translateX(' + d.x + 'px) translateY(' + d.y + 'px)'; });

    // Now that the parents are bound, bind children.
    // These are the official canvas placeholders, and
    // will be filled with images on a promise.
    vantages.selectAll('.frame')
        .data(function(d) { return d.frames;})
    // new enter selection specifically dealing with this data set.
        .enter()
        .append('div')
        .attr('class', 'frame')
        .style('width', function(d) { return d.width + 'px'; })
        .style('height', function(d) { return d.height + 'px'; })
        .style('transform', function(d) { return 'translateX(' + d.x + 'px) translateY(' + d.y + 'px)'; });

    // Canvas labels, again the data is a nested subset of the vantages.
    vantages.selectAll('h4')
        .data(function(d) { return d.frames;})
    // New enter selection specifically dealing with this data set.
        .enter()
        .append('h4').text(function(d) {return d.label;});
}
