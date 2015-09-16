'use strict';

var imageGraph = require('./imageGraph');
var imageRenderer = require('./imageRenderer');

function osdComponent(options) {
  var element,
      container = options.container,
      canvasHelper = options.canvasHelper,
      transitionStore = options.transitionStore,
      dispatcher = options.dispatcher,
      graph,
      renderer,
      osd;

  element = document.createElement('div');
  element.className = 'osdContainer';
  element.style.cssText = 'position:absolute;width:100%;height:100%;top:0;left:0;';
  options.container.appendChild(element);

  osd = OpenSeadragon({
    element: element,
    showNavigationControl: false
  });

  graph = imageGraph(transitionStore, dispatcher);
  renderer = imageRenderer(osd, graph, canvasHelper);

  // osd.addHandler('animation', function(event) {
  //   synchroniseZoom();
  // });

  // osd.addHandler('zoom', function(event) {
  //   applyConstraints(_constraintBounds);
  // });

  // osd.addHandler('pan', function(event) {
  //   applyConstraints(_constraintBounds);
  // });

  // function applyConstraints() =

  return osd;
};

module.exports = osdComponent;
