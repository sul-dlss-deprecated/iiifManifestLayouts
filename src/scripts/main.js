var _ = require('underscore');
var $ = require('jquery');
var d3 = require('d3');
var jsonLd;

// App javascript goes here
console.log("loaded main.js, all is well!");

// D3 example
$.get('http://purl.stanford.edu/fw090jw3474/iiif/manifest.json', function(data) {
    jsonLd = data;
    layout();
});

var layout = function(options) {
    var lineHeight = 100,
        maxFrameWidth = 300,
        minFrameWidth = 30,
        facingCanvasMargin,
        singleCanvasMargin,
        viewportPadding,
        container,
        mode,
        selectedCanvasId,
        transitionType,
        framingStrategies = ['contain', 'cover', 'scale', 'hybrid'],
        lineOptions = ['center', 'left-justify', 'right-justify', 'justify-using-spaces', 'justify-using-width'];

    // The following framingStrategies specify how a canvas fits inside its "frame".
    // A "frame" is an abstract target that the user may click on.

    function contain() {
        // The item target is the same regardless of the object inside of it,
        // and the canvas is scaled down on its longest side in order to fit
        // inside of the box. Alternatively, there may be allowed a fixed-size
        // "portrait" or "landscape" view into which the object is scaled
        // depending on its aspect ratio bias.
        // This would also be the best way to properly scale objects so that
        // they reflect their relative
    }

    function hybrid() {
        // The canvas will scale itself to fit the height of the line,
        // or until it as reached the maximum width of a frame.
        // If it 
    }

    var layoutData = jsonLd.sequences[0].canvases.map(function(canvas) {
        return {
            id: canvas['@id'],
            label: canvas.label,
            height: canvas.height,
            width: canvas.width
        };
    });

    d3.select('#d3-example')
        .selectAll('div')
        .data(layoutData)
        .enter().append('div')
        .classed('bar', true)
        .text(function(d) { return d.label; });
};
