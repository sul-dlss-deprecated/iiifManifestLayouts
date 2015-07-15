var _ = require('underscore');
var $ = require('jquery');
var d3 = require('d3');

// App javascript goes here
console.log("loaded main.js, all is well!");

// D3 example
$.get('http://purl.stanford.edu/fw090jw3474/iiif/manifest.json', function(data) {
    renderManifest(data);
});

var manifestLayout = function(options) {
    var maxFrameHeight = options.maxFrameHeight || 130, // screen pixels
        maxFrameWidth = options.maxFrameWidth ||  300, // screen pixels
        minFrameWidth = options.minFrameWidth ||  30,  // screen pixels
        minFrameHeight = options.minFrameHeight ||  30,  // screen pixels
        frameHeight = options.minFrameHeight ||  30,  // screen pixels
        frameWidth = options.minFrameWidth ||  30,  // screen pixels
        scaleFactor = options.scaleFactor || 1,
        columns = options.columns || 8,
        containerPadding = {
            top: options.topPadding || 0,
            bottom: options.topPadding || 0,
            left: options.topPadding || 0,
            right: options.topPadding || 0
        },
        vantagePadding = {
            top: options.topPadding || 0,
            bottom: options.topPadding || 0,
            left: options.topPadding || 0,
            right: options.topPadding || 0
        },
        facingCanvasPadding,  // screen pixels
        viewportPadding,     // screen pixels
        containerHeight = options.height,
        containerWidth = options.width,
        canvases = options.canvases,
        framingStrategy = options.framingStrategy || 'contain',
        viewingDirection = options.viewingDirection || 'left-to-right',
        viewingHint = options.viewingHint || null,
        lineStrategy,

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
            grid: gridLine
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
        var orientation = canvas.aspectRatio < 1.0 ? 'portrait' : 'landscape',
            widthScaleFactor = frameWidth/canvas.width,
            heightScaleFactor = frameHeight/canvas.height;

        canvas.width = orientation === 'portrait' ? frameWidth*widthScaleFactor : frameWidth;
        canvas.height = orientation === 'portrait' ? frameHeight : frameHeight.height*heightScaleFactor;

        return canvas;
    }

    function hybrid(canvas, maxFrameWidth, maxFrameHeight) {
    }

    function vantage(frames, padding) {
        // A vantage can wrap several book pages
        // into what will become a single higlight,
        // hover, or click target.
        if (frames[1]) {
            return {
                width: (frames[0].width + frames[1].width)
                    + padding.left + padding.right + facingCanvasPadding,
                height: (frames[0].height + frames[1].height)
                    + padding.top + padding.bottom + facingCanvasPadding,
                frames: frames
            };
        } else {
            return {
                width: frames[0].width + padding.left + padding.right,
                height: frames[1].height + padding.top + padding.bottom,
                frames: frames
            };
        }
    }

    function gridLine(vantages, frameHeight, frameWidth, lineWidth) {
        var vantagesPerLine = Math.floor(lineWidth/frameWidth);
        return vantages.map(function(vantage) {
        });
    }

    function bindPages(vantages, viewingHint, facingCanvasPadding) {
    }

    function layout() {
        // Reads the configuration
        // and structures the calculation with
        // the appropriate strategies.

        var frame = framingStrategies[framingStrategy];
        var align = lineStrategies[lineStrategy];

        var vantages = canvases.map(function(canvas) {
            return vantage(frame(pruneCanvas(canvas),
                                 maxFrameWidth,
                                 maxFrameHeight
                                ),
                           vantagePadding,
                           viewingHint
                          );
        });

        return align(bindPages(vantages, viewingHint, facingCanvasPadding), frameHeight, frameWidth, containerWidth);
    }

    return layout();

};

function renderManifest(manifest) {
    var container = $('#d3-example');

    var layoutData = manifestLayout({
        canvases: manifest.sequences[0].canvases,
        width: container.width(),
        height: container.height()
    });

    console.log(layoutData);

    d3.select('#d3-example')
        .selectAll('div')
        .data(layoutData)
        .enter().append('div')
        .classed('frame', true)
        .style('width', function(d) { console.log(d.width); return d.width + 'px'; })
        .style('height', function(d) { return d.height + 'px'; })
        .style('transform', function(d) { return 'translateX(' + d.x + 'px), translateY(' + d.y + 'px)'; })
        .text(function(d) {
            return d.label;
        });
}
