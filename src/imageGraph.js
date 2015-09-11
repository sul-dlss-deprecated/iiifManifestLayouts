'use strict';

var manifestLayout = require('./manifestLayout');
var canvasLayout = require('./canvasLayout');
var iiif = require('./iiifUtils');
var d3 = require('./lib/d3-slim-dist');

function imageGraph(stores) {
  var renderData = stores.getState();
  console.log(renderData);

  // creare a document fragment to draw "offline"
  var graphRoot = document.createDocumentFragment();

  var imageGraph = d3.select(graphRoot).append("svg")
        .attr("width", renderData.width)
        .attr("height", renderData.height)
        .call(renderImageScene);

  function renderImageScene(selection) {
    console.log('called');
  }

  return imageGraph;
};

module.exports = imageGraph;
