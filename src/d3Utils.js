'use strict';

var d3 = require('./lib/d3-slim-dist');

var d3Utils = function(config) {
  this.renderState = config.renderState;
  this.viewerState = config.viewerState;
  this.scrollContainer = config.scrollContainer;
  this.overlays = config.overlays;
  this.canvasClass = config.canvasClass;
  this.frameClass = config.frameClass;
  this.labelClass = config.labelClass;
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
  },

  renderLayout: function(layoutData, animate, callback) {
    // To understand this render function,
    // you need a general understanding of d3 selections,
    // and you will want to read about nested
    // selections in particular: http://bost.ocks.org/mike/nest/

    var self = this;
    var interactionOverlay = d3.select(this.overlays[0]);
    var animationTiming = animate ? 1000 : 0;
    var frame = interactionOverlay.selectAll('.' + this.frameClass).data(layoutData);

    var getWidthInPx = function(d) { return d.width + 'px'; };
    var getHeightInPx = function(d) { return d.height + 'px'; };

    var getCanvasWidthInPx = function(d) { return d.canvas.width + 'px'; };
    var getCanvasHeightInPx = function(d) { return d.canvas.height + 'px'; };

    var getTransformStyle = function(d) {
      return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
    };

    var getClass = function(d) {
      var selected = d.canvas.selected;
      return selected ? self.canvasClass + ' selected' : self.canvasClass;
    };

    frame
      .style('width', getWidthInPx)
      .style('height', getHeightInPx)
      .transition()
      .duration(animationTiming)
      .ease('cubic-out')
      .styleTween('transform', getTransformStyle)
      .styleTween('-webkit-transform', getTransformStyle)
      .tween(
        'translateTilesources',
        function(d, i) {
          var canvas = self.viewerState.getState().canvasObjects[d.canvas.id];
          var currentBounds = canvas.getBounds();

          var xi = d3.interpolate(currentBounds.x, d.canvas.x);
          var yi = d3.interpolate(currentBounds.y, d.canvas.y);

          return function(t) {
            canvas.setBounds(xi(t), yi(t), d.canvas.width, d.canvas.height);
          };
        }
      )
      .call(
        this._endall,
        function() { if (callback) { callback(); }}
      );

    frame.select('.' + this.canvasClass)
      .style('width', getCanvasWidthInPx)
      .style('height', getCanvasHeightInPx)
      .attr('class', getClass)
      .transition()
      .duration(animationTiming)
      .ease('cubic-out')
      .styleTween('transform', function(d) {
        return d3.interpolateString(
          this.style.transform,
          'translate(' + d.canvas.localX +'px,' + d.canvas.localY + 'px)'
        );
      })
      .styleTween('-webkit-transform', function(d) {
        return d3.interpolateString(
          this.style.transform,
          'translate(' + d.canvas.localX +'px,' + d.canvas.localY + 'px)'
        );
      });

    var frameEnter = frame
          .enter().append('div')
          .attr('class', this.frameClass)
          .style('width', getWidthInPx)
          .style('height', getHeightInPx)
          .style('transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; })
          .style('-webkit-transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; });

    frameEnter
      .append('div')
      .attr('class', getClass)
      .attr('data-id', function(d) {
        return d.canvas.id;
      })
      .style('width', getCanvasWidthInPx)
      .style('height', getCanvasHeightInPx)
      .style('transform', function(d) { return 'translateX(' + d.canvas.localX + 'px) translateY(' + d.canvas.localY + 'px)'; })
      .style('-webkit-transform', function(d) { return 'translateX(' + d.canvas.localX + 'px) translateY(' + d.canvas.localY + 'px)'; })
      .each(function(d) {
        var canvasData = d.canvas,
            canvasImageState = self.viewerState.getState().canvasObjects[canvasData.id];

        canvasImageState.setBounds(canvasData.x, canvasData.y, canvasData.width, canvasData.height);
        canvasImageState.openThumbnail();
      });
    // .append('img')
    // .attr('src', function(d) { return d.canvas.iiifService + '/full/' + Math.ceil(d.canvas.width * 2) + ',/0/default.jpg';});

    frameEnter
      .append('div')
      .attr('class', this.labelClass)
      .text(function(d) { return d.canvas.label; });
  },

  _endall: function(transition, callback) {
    var n = 0;
    if (transition.empty()) {callback();} else {
      transition
        .each(function() { ++n; })
        .each("end", function() { if (!--n) callback.apply(this, arguments); });
    }
  },
};

module.exports = d3Utils;
