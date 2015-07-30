var $ = require('jquery');
var d3 = require('d3');
var osd = require('./openseadragon');

var manifest,
    viewer;

// D3 example
$.get('http://purl.stanford.edu/fw090jw3474/iiif/manifest.json', function(data) {
    manifest = data;
    initOSD();
    renderManifest(manifest);
});

var manifestLayout = function(options) {
    var maxFrameHeight = options.maxFrameHeight || 130, // screen pixels
        maxFrameWidth = options.maxFrameWidth ||  30, // screen pixels
        minFrameWidth = options.minFrameWidth ||  30,  // screen pixels
        minFrameHeight = options.minFrameHeight ||  30,  // screen pixels
        frameHeight = options.frameHeight ||  100,  // screen pixels
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
            aspectRatio: canvas.width/canvas.height,
            iiifService: canvas.images[0].resource.service['@id']
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
            fitHeight(canvas, frameHeight);
        } else {
            fitWidth(canvas, frameWidth);
        }

        return canvas;
    }
    function fitHeight(canvas, frameHeight) {
        var portrait = canvas.aspectRatio <= 1.0 ? true : false,
            scaleFactor = frameHeight/canvas.height;

        canvas.height = frameHeight;
        // we forced the height to fit, so the width
        // must be scaled according to the height.
        canvas.width = canvas.width*scaleFactor;

        return canvas;
    }
    function fitWidth(canvas, frameWidth) {
        var portrait = canvas.aspectRatio <= 1.0 ? true : false,
            scaleFactor = frameHeight/canvas.width;

        canvas.width = frameWidth;
        // we forced the width to fit, so the height
        // must be scaled according to the width.
        canvas.height = canvas.height*scaleFactor;

        return canvas;
    }

    function hybrid(canvas, maxFrameWidth, maxFrameHeight) {
        // Fixed height layout with auto-fitting
        // of extremely long or extremeley tall
        // objects into a maximum width.
    }

    function vantage(frame, padding) {
        // A vantage can wrap several book pages
        // into what will become a single higlight,
        // hover, or click target.
        frame.localX = padding.left;
        frame.localY = padding.top;
        return {
            width: frame.width + padding.left + padding.right,
            height: frame.height + padding.top + padding.bottom,
            frame: frame
        };
    }

    function gridAlign(vantages, frameHeight, frameWidth, lineWidth) {
        var vantagesPerLine = Math.floor(lineWidth/frameWidth),
        vantagesLength = vantages.length;

        return vantages.map(function(vantage, index) {
            var lineNumber = Math.floor((index)/vantagesPerLine),
                lineIndex = index%vantagesPerLine;
            // The frames must get their x and y properties
            // after the vantage (the parent) props are set.
            vantage.x = vantage.width*lineIndex;
            vantage.y = lineNumber*vantage.height; // y determined by the line;

            vantage.frames.forEach(function(frame, index) {
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

    // function layout() {
    //     // Reads the configuration
    //     // and structures the calculation with
    //     // the appropriate strategies.

    //     // Resolve the strategies used for the
    //     // calculation based on the combination of
    //     // options. These will all be functions
    //     // to be run at the appropriate stage
    //     // of the layout algorithm.
    //     var frame = framingStrategies[framingStrategy];
    //     var align = lineStrategies[lineStrategy];

    //     // Prepare each node's layout parameters
    //     // before passing them into the line-level
    //     // functions.
    //     var vantages = canvases.map(function(canvas) {
    //         return vantage([frame(pruneCanvas(canvas),
    //                               frameWidth,
    //                               frameHeight
    //                              )],
    //                        vantagePadding,
    //                        viewingHint
    //                       );
    //     });

    //     // Take each vantage and mutate it to encompass
    //     // facing pages, then use options to further
    //     // mutate their x, y, width, and height coordinates
    //     // to position them appropriately.
    //     return align(bindPages(vantages, viewingHint, viewingDirection, facingCanvasPadding),
    //                  frameHeight,
    //                  frameWidth,
    //                  containerWidth,
    //                  viewingDirection
    //                 );
    // }
    function fixedHeightAlign(vantages, lineWidth, viewingDirection) {
        var lines = [];

        lines.currentLine = 0;
        lines.addLine = function() {
            var line = lines[lines.currentLine] = [];
            line.remaining = lineWidth;

            return line;
        };
        lines.addItem = function(vantage) {
            var line = this[this.currentLine];

            if (!line) { line = this.addLine(); }

            if (line.remaining >= vantage.width) {
                var x = line.remaining;
                line.remaining -= vantage.width;
                return [lineWidth - x, lines.currentLine];
            }

            this.currentLine += 1;
            line = lines.addLine();
            x = line.remaining;
            line.remaining -= vantage.width;
            return [lineWidth - x, this.currentLine];
        };

        return vantages.map(function(vantage) {
            var lineStats = lines.addItem(vantage);
            vantage.x = lineStats[0];
            vantage.y = lineStats[1]*vantage.height;
            vantage.frame.x = vantage.x + vantage.frame.localX;
            vantage.frame.y = vantage.y + vantage.frame.localY;
            return vantage;
        });
    }

    function layout() {
        var vantages = canvases.map(pruneCanvas).map(function(canvas) {
            return vantage(fitHeight(canvas, frameHeight), vantagePadding);
        });

        return fixedHeightAlign(vantages, containerWidth, viewingDirection);
    }

    // Book
    // Opening Focused
    // Single Focused
    // Top-to-bottom Focused
    // Continuous Focused

    return layout();

};

function renderManifest(manifest) {
    var container = $('#d3-example');
    console.log(manifest);

    var layoutData = manifestLayout({
        canvases: manifest.sequences[0].canvases,
        width: container.width(),
        height: container.height(),
        frameHeight: 100,
        frameWidth: 100,
        vantagePadding: {
            top: 0,
            bottom: 50,
            left: 5,
            right: 5
        }
    });

    console.log(layoutData);

    var interactionOverlay = d3.select('#d3-example');

    // To understand this layout, read: http://bost.ocks.org/mike/nest/
    var vantage = interactionOverlay.selectAll('.vantage')
            .data(layoutData);

    var vantageUpdated = vantage
            .style('width', function(d) { return d.width + 'px'; })
            .style('height', function(d) { return d.height + 'px'; })
            .transition()
            .styleTween('transform', function(d) {
                return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
            })
            .styleTween('-webkit-transform', function(d) {
                return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
            });
    // name an item that is moving left or right only
    // vs an item that is moving up or down a line.
    // Items that are moving within their line stay on top,
    // those shifting up and down shuffle in from befhind.

    var vantageEnter = vantage
            .enter().append('div')
            .attr('class', 'vantage')
            .style('width', function(d) { return d.width + 'px'; })
            .style('height', function(d) { return d.height + 'px'; })
            .style('transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; })
            .style('-webkit-transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; });

    vantageEnter
        .append('div')
        .attr('class', 'frame')
        .style('width', function(d) { console.log(d); return d.frame.width + 'px'; })
        .style('height', function(d) { return d.frame.height + 'px'; })
        .style('transform', function(d) { return 'translateX(' + d.frame.localX + 'px) translateY(' + d.frame.localY + 'px)'; })
        .append('img')
        .attr('src', function(d) { return d.frame.iiifService + '/full/' + Math.ceil(d.frame.width * 2) + ',/0/default.jpg';});

    vantageEnter
        .append('h4').text(function(d) { return d.frame.label; });



    // Staged animations
    // * Takes viewport into account
    // From Thumb to single-page
    // moving left and right
    // scroll view <=> book view <=> top-to-bottom view <=> single page view
    // * Does not care about viewport
    // In thumb mode, changing to book, scroll, or top-bottom view
    // focus to thumb: book, scroll, single;
}

var initOSD = function() {
    viewer = OpenSeadragon({
            id: "osd-container",
            autoResize:true,
            showHomeControl: false
        });
}

$(window).on('resize', function(){renderManifest(manifest);});
