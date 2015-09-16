'use strict';

var d3 = require('./lib/d3-slim-dist');

var imageRenderer = function(osd, graph, helper) {

  d3.timer(function() {
    osd.forceRedraw();
  });

  renderOSD();

  function renderOSD() {
    console.log(graph);
    graph.selectAll('.entering')
      .each(enterImage);
    // graph.selectAll('.exiting')
    //   .each(removeTiledImage);
    graph.selectAll('updating')
      .each(updateImages);
    // graph.selectAll('needed')
    //   .each(swapAndWarm);
    // States in which an image might be.
    // 1.) Neither its dummy nor its real source are needed yet.
    // 2.) Its dummy is needed, but it has not been requested yet.
    // 3.) Its dummy is needed, and has been requested, but it hasn't been added to the canvas yet.
    // 4.) Its dummy is needed and has been added to the canvas.
    // 5.) The real tilesource is needed
  }

  // function synchroniseZoom() {
  //   var viewerWidth = viewer.container.clientWidth;
  //   var viewerHeight = viewer.container.clientHeight;
  //   var center = viewer.viewport.getCenter(true);
  //   var p = center.minus(new OpenSeadragon.Point(viewerWidth / 2, viewerHeight / 2));
  //   var zoom = viewer.viewport.getZoom(true);
  //   var scale = viewerWidth * zoom;

  //   var transform = 'scale(' + scale + ') translate(' + -p.x + 'px,' + -p.y + 'px)';

  //   d3.select(overlays[0])
  //     .style('transform', transform)
  //     .style('-webkit-transform', transform);
  // }

  // function synchronisePan(panTop, width, height) {
  //   var x = width/2;
  //   var y = panTop + height/2;
  //   viewer.viewport.panTo(new OpenSeadragon.Point(x,y), true);
  // }

  //   if (userState.perspective === 'detail') {
  //     var viewBounds = layout.intermediate().filter(function(frame) {
  //       return frame.canvas.selected;
  //     })[0].vantage;
  //     updateConstraintBounds(viewBounds);

  //     var osdBounds = new OpenSeadragon.Rect(viewBounds.x, viewBounds.y, viewBounds.width, viewBounds.height);

  //     setScrollElementEvents();
  //     viewer.viewport.fitBounds(osdBounds, false);
  //   } else {
  //     viewBounds = new OpenSeadragon.Rect(0,0, canvasState().width, canvasState().height);
  //     _zooming = true;
  //     setScrollElementEvents();
  //     viewer.viewport.fitBounds(viewBounds, false);
  //     setTimeout(function(){
  //       _zooming = false;
  //       setScrollElementEvents();
  //     }, 1200);
  //   }
  // }

  // function endall(transition, callback) {
  //   var n = 0;
  //   if (transition.empty()) {callback();} else {
  //     transition
  //       .each(function() { ++n; })
  //       .each("end", function() { if (!--n) callback.apply(this, arguments); });
  //   }
  // }

  // function translateTilesources(d, i) {
  //   var canvasId = d.canvas.id,
  //       dummyObj = canvasImageStates()[canvasId].dummyObj;

  //   var currentBounds = dummyObj.getBounds(true),
  //       xi = d3.interpolate(currentBounds.x, d.canvas.x),
  //       yi = d3.interpolate(currentBounds.y, d.canvas.y);

  //   return function(t) {
  //     dummyObj.setPosition(new OpenSeadragon.Point(xi(t), yi(t)), true);
  //     dummyObj.setWidth(d.canvas.width, true);
  //     dummyObj.setHeight(d.canvas.height, true);
  //   };
  // }

function updateImages(d, index, graphNode) {
    var canvasData = d,
        node = d3.select(graphNode),
        resource = helper[canvasData.id][0];
  resource.setPosition(new OpenSeadragon.Point(node.x, node.y), true);
  resource.setWidth(node.width, true);
  resource.setHeight(node.height, true);
  resource.setOpacity(node.opacity, true);

    // canvasImageStates.forEach(function(resource) {
    //   resource.setPosition(new OpenSeadragon.Point(xi(t), yi(t)), true);
    //   resource.setWidth(resource.width, true);
    //   resource.setHeight(resource.height, true);
    //   resource.setOpacity(resource.opacity, true);
    // });
  }

  function enterImage(canvasData, index, graphNode) {
    var canvasHelper = helper[canvasData.id][0];
      osd.addTiledImage({
        x: canvasData.x,
        y: canvasData.y,
        width: canvasData.width,
        tileSource: canvasHelper.tileSource,
        success: function(event) {
          canvasHelper.setOsdImageObj(event.item);
        }
      });
  }

  // function fade(image, targetOpacity, callback) {
  // example usage fade(dummyObj, 0, function() { viewer.world.removeItem(dummyObj); });
  //   var currentOpacity = image.getOpacity();
  //   var step = (targetOpacity - currentOpacity) / 10;
  //   if (step === 0) {
  //     callback();
  //     return;
  //   }

  //   var frame = function() {
  //     currentOpacity += step;
  //     if ((step > 0 && currentOpacity >= targetOpacity) || (step < 0 && currentOpacity <= targetOpacity)) {
  //       image.setOpacity(targetOpacity);
  //       callback();
  //       return;
  //     }

  //     image.setOpacity(currentOpacity);
  //     OpenSeadragon.requestAnimationFrame(frame);
  //   };
  //   OpenSeadragon.requestAnimationFrame(frame);
  // };

  function removeImages(d) {
  }

};

module.exports = imageRenderer;
