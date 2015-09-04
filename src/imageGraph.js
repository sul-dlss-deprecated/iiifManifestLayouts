'use strict';

var manifestLayout = require('./manifestLayout');
var canvasLayout = require('./canvasLayout');
var iiif = require('./iiifUtils');
var d3 = require('./lib/d3-slim-dist');

function imageGraph(stores) {

  // creare a document fragment to draw "offline"
  var graphRoot = document.createDocumentFragment();

  var imageGraph = d3.select(sketchFrag).append("svg")
        .attr("width", w)
        .attr("height", h)
        .call(renderImageScene);

  function renderImageScene(selection) {
  }

  // This renders the graph of nodes according to node law.
  // The land of the nodes is a cruel and harsh one,
  // but for the nodes, who have inhabited these
  // barren wastes for eons now,
  // it will always be home.

  return imageGraph;
};

module.exports = imageGraph;
