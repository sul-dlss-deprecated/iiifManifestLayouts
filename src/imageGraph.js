'use strict';

var manifestLayout = require('./manifestLayout');
var canvasLayout = require('./canvasLayout');
var d3 = require('./lib/d3-slim-dist');

function imageGraph(layoutStore, dispatcher) {
  // create a document fragment to draw "offline"
  var graphRoot = document.createDocumentFragment();

  var imageGraph = d3.select(graphRoot).append("svg");

  dispatcher.on('transitionStateUpdated', function() {console.log('eventHeard'); refreshGraph();});

  function refreshGraph() {
    var layout = layoutStore.getState().targetLayout.overview().map(function(frame){
      return frame.canvas;
    });
    imageGraph
      .attr("width", layout.width)
      .attr("height", layout.height);
    imageGraph.selectAll('.canvas')
      .data(layout)
      .classed('entering', false)
      .classed('selected', false)
      .classed('updating', true)
      .attr('width', canvasWidth)
      .attr('height', canvasHeight)
      .attr('x', canvasX)
      .attr('y', canvasY)
      .enter()
      .append('rect')
      .classed('canvas', true)
      .classed('selected', true)
      .classed('entering', true)
      .attr('data-canvas-id', canvasId)
      .attr('width', canvasWidth)
      .attr('height', canvasHeight)
      .attr('x', canvasX)
      .attr('y', canvasY);
  }

  function canvasId(canvas) { return canvas.id; }
  function canvasWidth(canvas) { return canvas.width; }
  function canvasHeight(canvas) { return canvas.height; }
  function canvasX(canvas) { return canvas.x; }
  function canvasY(canvas) { return canvas.y; }

  return imageGraph;
};

module.exports = imageGraph;
