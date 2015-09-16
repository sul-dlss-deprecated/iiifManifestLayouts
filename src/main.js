'use strict';

var viewStateStore = require('./viewStateStore'),
    transitionStore = require('./transitionStore'),
    helper = require('./canvasHelper'),
    osdComponent = require('./osdComponent'),
    overlayComponent = require('./overlayComponent'),
    events = require('events');

var manifestor = function(options) {
  var manifestor,
      dispatcher,
      canvasHelper,
      transitions,
      osd,
      overlays;

  dispatcher = new events.EventEmitter();
  manifestor = viewStateStore(options, dispatcher);
  canvasHelper = helper(manifestor.getState().canvases);
  transitions = transitionStore(manifestor, dispatcher);

  osd = osdComponent({
    container: options.container,
    canvasHelper: canvasHelper,
    transitionStore: transitions,
    dispatcher: dispatcher
  });

  // overlays = overlayComponent({
  //   container: options.container,
  //   canvasHelper: manifestor.helper,
  //   dispatcher: dispatcher
  // });

  manifestor.osd = osd;
  // manifestor.overlays = overlays,
  manifestor.events = dispatcher;
  return manifestor;
};

module.exports = manifestor;
