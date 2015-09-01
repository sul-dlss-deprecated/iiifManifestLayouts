function renderLayout(layoutData, animate, callback) {
  // To understand this render function,
  // you need a general understanding of d3 selections,
  // and you will want to read about nested
  // selections in particular: http://bost.ocks.org/mike/nest/

  var interactionOverlay = d3.select(overlays[0]),
      animationTiming = animate ? 1000 : 0;

  // var bounds = interactionOverlay.selectAll('.vantage')
  //         .data(
  //             (function() {
  //                 return [layoutData.filter(function(frame){
  //                     return frame.canvas.selected;
  //                 })[0].vantage];
  //             })())
  //         .enter()
  //         .append('div')
  //         .attr('class', 'vantage')
  //         .style('border', '3px solid orangered')
  //         .style('box-sizing', 'border-box')
  //         .style('width', function(d) { console.log (d); return d.width + 'px'; })
  //         .style('height', function(d) { return d.height + 'px'; })
  //         .style('position', 'absolute')
  //         .transition()
  //         .duration(animationTiming)
  //         .ease('cubic-out')
  //         .styleTween('transform', function(d) {
  //             return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
  //         })
  //         .styleTween('-webkit-transform', function(d) {
  //             return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
  //         });

  var frame = interactionOverlay.selectAll('.' + frameClass)
        .data(layoutData);

  var frameUpdated = frame
        .style('width', function(d) { return d.width + 'px'; })
        .style('height', function(d) { return d.height + 'px'; })
        .transition()
        .duration(animationTiming)
        .ease('cubic-out')
        .styleTween('transform', function(d) {
          return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
        })
        .styleTween('-webkit-transform', function(d) {
          return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
        })
        .tween('translateTilesources', translateTilesources)
        .each(updateImages)
        .call(endall, function() {
          if (callback) { callback();}
        });

  frame.select('.' + canvasClass)
    .style('width', function(d) { return d.canvas.width + 'px'; })
    .style('height', function(d) { return d.canvas.height + 'px'; })
    .attr('class', function(d) {
      var selected = d.canvas.selected;
      return selected ? canvasClass + ' selected' : canvasClass;
    });

  var frameEnter = frame
        .enter().append('div')
        .attr('class', frameClass)
        .style('width', function(d) { return d.width + 'px'; })
        .style('height', function(d) { return d.height + 'px'; })
        .style('transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; })
        .style('-webkit-transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; });

  frameEnter
    .append('div')
    .attr('class', function(d) {
      var selected = d.canvas.selected;
      return selected ? canvasClass + ' selected' : canvasClass;
    })
    .attr('data-id', function(d) {
      return d.canvas.id;
    })
    .style('width', function(d) { return d.canvas.width + 'px'; })
    .style('height', function(d) { return d.canvas.height + 'px'; })
    .style('transform', function(d) { return 'translateX(' + d.canvas.localX + 'px) translateY(' + d.canvas.localY + 'px)'; })
    .each(enterImages);
  // .append('img')
  // .attr('src', function(d) { return d.canvas.iiifService + '/full/' + Math.ceil(d.canvas.width * 2) + ',/0/default.jpg';});

  frameEnter
    .append('div')
    .attr('class', labelClass)
    .text(function(d) { return d.canvas.label; });

};
