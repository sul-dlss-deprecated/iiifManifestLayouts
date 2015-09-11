'use strict';

var viewStateStore = require('./viewStateStore'),
    imageGraph = require('./imageGraph'),
    domComponent = require('./domComponent'),
    canvasHelper = require('./canvasHelper');

var manifestor = function(options) {
  var manifestor = viewStateStore(options);

  var dom = domComponent(options.container),
      helper = canvasHelper(manifestor.getState().canvases),
      osd = OpenSeadragon({
        element: dom.osdElement,
        showNavigationControl: false
      }),
      graph = imageGraph(manifestor);

  // beginning layout
  //          - unbind events, force remove styles
  // current layout
  // (this is determined as a function of time)
  // target layout
  //          - bind events, force styles

  // A transition consists of a timer, an interpolator,
  // a start quantity (or set of quantities), and an end property.
  //
  // Based on the interpolation function, the quantity(ies) are
  // varied over the set time.
  //
  // Additionally, a transition can have a start event for side effects,
  // and an end event for side effects upon its completion.
  //
  // However, difficulties emerge when we need to interrupt the transition.
  // We need to not run the start callback of the interrupting transition,
  // use the real current layout as the initial layout of the new transition,
  // and prevent the end callback of the first transition from running.
  // The biggest gray spot, however, comes from the holdover state of the interpolator.
  // Should there be some sense of "velocity" held over from the motion of the
  // previous transition. That would be preferable.

  if (options.defaultEvents !== false) {
    // bindDefaultEvents(dom);
  }

  return manifestor;
};

module.exports = manifestor;
