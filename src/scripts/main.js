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
      console.log(canvas)
        return {
            id: canvas['@id'],
            label: canvas.label,
            height: canvas.height,
            width: canvas.width,
            scaledHeight: Math.floor((canvas.height * 100) / canvas.width),
            iiifService: canvas.images[0].resource.service['@id']
        };
    });

  var thumbWidth = 100;
  var areaWidth = $('#d3-example').width();
  var thumbMargin = 30;
  var thumbsPerRow = Math.floor(areaWidth / (thumbWidth + thumbMargin));
  var numberOfRows = Math.ceil(layoutData.length / thumbsPerRow);

  var maxThumbHeight = d3.max(layoutData, function(d) {
    return d.scaledHeight;
  });

  var thumbs = d3.select('#d3-example')
    .selectAll('div')
    .data(layoutData)
    .enter().append('div')
    .classed('bar', true)
    .style('width', thumbWidth +'px')
    .style('height', function(d) { return d.scaledHeight + 'px'; })
    .style('top', function(d, i) {
      var row = Math.floor(i / thumbsPerRow);
      return (row * (maxThumbHeight + thumbMargin)) + 'px';
    })
    .style('left', function(d, i) {
      var column = (i % thumbsPerRow);
      return (column * (thumbWidth + thumbMargin)) + 'px';
    });

    thumbs.append('img')
      .style('width', thumbWidth +'px')
      .attr('src', function(d) {
        return d.iiifService + '/full/' + thumbWidth * 2 + ',/0/default.jpg';
      });

    thumbs.append('span').text(function(d) { return d.label; });
};
