'use strict';

var viewStateStore = require('./viewStateStore'),
    imageGraph = require('./imageGraph'),
    domComponent = require('./domComponent');

var manifestor = function(options) {
  var manifestor = viewStateStore(options);

  manifestor.dom = domComponent(options.container);
  manifestor.osd = manifestor.canvas.osd;

  manifestor.osd = OpenSeadragon({
    element: manifestor.dom.osdElement,
    showNavigationControl: false
  });

  manifestor.graphRoot = {};

  return manifestor;
};

module.exports = manifestor;
