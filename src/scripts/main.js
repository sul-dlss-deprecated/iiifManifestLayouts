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
            width: canvas.width,
            scaledHeight: Math.floor((canvas.height * 100) / canvas.width)
        };
    });

    var thumbWidth = 100;
    var areaWidth = $('#d3-example').width();
    var thumbMargin = 20;
    var thumbsPerRow = Math.floor(areaWidth / (thumbWidth + thumbMargin));
    var numberOfRows = Math.ceil(layoutData.length / thumbsPerRow);

    var maxThumbHeight = d3.max(layoutData, function(d) {
      return d.scaledHeight;
    });

    d3.select('#d3-example')
      .append('svg')
      .style('height', ((maxThumbHeight + thumbMargin) * numberOfRows) + 'px');
        
    var g = d3.select('svg')
      .selectAll('g')
      .data(layoutData)
      .enter().append('g')
      .attr('transform', function(d, i) {
        var column = (i % thumbsPerRow);
        var row = Math.floor(i / thumbsPerRow);
        return 'translate(' + (column * (thumbWidth + thumbMargin)) + ',' + (row * (maxThumbHeight + thumbMargin)) + ')';
      });

    // Add Rects for thumbnails
    g.append('rect')
      .style('width', thumbWidth + 'px')
      .style('height', function(d) {
        return  d.scaledHeight + 'px';
      });
    
    g.append('image')
    .attr('width', thumbWidth + 'px')
    .attr('height', function(d) {
      return  d.scaledHeight + 'px';
    })
    .attr('xlink:href', function(d) {
      return 'http://www.placecage.com/' + thumbWidth + '/' + d.scaledHeight;
    });

    // Add Labels
    g.append('text')
      .text(function(d) { return d.label })
      .attr('y', thumbMargin + 'px' )
      .attr('x', thumbMargin + 'px')
    };
