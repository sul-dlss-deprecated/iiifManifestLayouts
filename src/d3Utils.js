'use strict';

var d3 = require('./lib/d3-slim-dist');

var d3Utils = function(config) {
  this.renderState = config.renderState;
  this.viewerState = config.viewerState;
  this.scrollContainer = config.scrollContainer;
  this.overlays = config.overlays;
};

d3Utils.prototype = {
  setScrollElementEvents: function() {
    if(! this.viewerState) {
      return;
    }
    var animationTiming = 1200;
    var interactionOverlay = d3.select(this.overlays[0]);
    var state = this.viewerState.getState();
    if (state.perspective === 'detail') {
      interactionOverlay
        .style('opacity', 0)
        .style('pointer-events', 'none');

      d3.select(this.scrollContainer[0])
        .style('pointer-events', 'none')
        .style('overflow-y', 'hidden');

    } else if(! this.renderState.getState().zooming) {
      interactionOverlay
        .style('pointer-events', 'all')
        .transition()
        .duration(animationTiming/2)
        .style('opacity', 1);

      d3.select(this.scrollContainer[0])
        .style('pointer-events', 'all')
        .style('overflow-y', 'scroll');
    }
  }
};

module.exports = d3Utils;
