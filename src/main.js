'use strict';

var d3 = require('./lib/d3-slim-dist');
var manifestLayout = require('./manifestLayout');
var canvasLayout = require('./canvasLayout');
var iiif = require('./iiifUtils');

var manifestor = function(options) {
    var manifest = options.manifest,
        sequence = options.sequence,
        canvases = options.sequence ? options.sequence.canvases : manifest.sequences[0].canvases,
        container = options.container,
        initialViewingDirection = options.viewingDirection ? options.viewingDirection : getViewingDirection(),
        initialViewingMode = options.viewingMode ? options.viewingHint : getViewingHint(),
        initialPerspective = options.perspective ? options.perspective : 'overview',
        selectedCanvas = options.selectedCanvas,
        viewer,
        _canvasState,
        _canvasImageStates;

    function getViewingDirection() {
        if (sequence && sequence.viewingDirection) {
            return sequence.viewingDirection;
        }
        return manifest.viewingDirection ? manifest.viewingDirection : 'left-to-right';
    };

    function getViewingHint() {
        if (sequence && sequence.viewingHint) {
            return sequence.viewingHint;
        }
        return manifest.viewingHint ? manifest.viewingHint : 'individuals';
    };

    buildCanvasStates(canvases);

    var overlays = $('<div class="overlaysContainer">').css(
        {'width': '100%',
         'height': '100%',
         'position': 'absolute',
         'top': 0,
         'left': 0
        });
    var osdContainer = $('<div class="osd-container">').css(
        {'width': '100%',
         'height': '100%',
         'position': 'absolute',
         'top': 0,
         'left': 0
        });
    var scrollContainer = $('<div class="scroll-container">').css(
        {'width': '100%',
         'height': '100%',
         'position': 'absolute',
         'top': 0,
         'left': 0,
         'overflow': 'hidden'//,
         // 'overflow-x': 'hidden',
         // 'overflow-y': 'scroll'
        });
    var ersatzOverlays = $('<div class="ersatzOverlays">').height(1800);

    container.append(osdContainer);
    container.append(scrollContainer);
    scrollContainer.append(ersatzOverlays);
    scrollContainer.append(overlays);
    initOSD();

    // set the initial state, which triggers the first rendering.
    canvasState({
        selectedCanvas: selectedCanvas, // @id of the canvas:
        perspective: initialPerspective, // can be 'overview' or 'detail'
        viewingMode: initialViewingMode, // manifest derived or user specified (iiif viewingHint)
        viewingDirection: initialViewingDirection, // manifest derived or user specified (iiif viewingHint)
        width: container.width(),
        height: container.height()
    });

    d3.timer(function() {
        viewer.forceRedraw();
    });

    function getViewingDirection() {
        if (sequence && sequence.viewingDirection) {
            return sequence.viewingDirection;
        }
        return manifest.viewingDirection ? manifest.viewingDirection : 'left-to-right';
    };

    function getViewingHint() {
        if (sequence && sequence.viewingHint) {
            return sequence.viewingHint;
        }
        return manifest.viewingHint ? manifest.viewingHint : 'individuals';
    };

    function canvasState(state) {

        if (!arguments.length) return _canvasState;
        _canvasState = state;

        render();

        return _canvasState;
    }

    function render() {
        var userState = canvasState();

        // Layout is configured from current user state. The
        // layout algorithm, viewing hints, animations (such as
        // initial layout without animation) are all
        // functions of the current user state.
        var layout = manifestLayout({
            canvases: canvases,
            width: userState.width,
            height: userState.height,
            scaleFactor: userState.scaleFactor,
            viewingDirection: userState.viewingd,
            viewingMode: userState.viewingMode,
            canvasHeight: 100,
            canvasWidth: 100,
            selectedCanvas: userState.selectedCanvas,
            framePadding: {
                top: 10,
                bottom: 40,
                left: 10,
                right: 10
            },
            containerPadding: {
                top: 50,
                bottom: 130,
                left: 200,
                right: 10
            },
            minimumImageGap: 5, // precent of viewport
            facingCanvasPadding: 1 // precent of viewport
        });

        // if (userState.perspective === 'detail' && userState.previousPerspective === 'overview') {
        //     var endCallback = function() {console.log('rendered overview from detail'); renderLayout(layout.overview(), true);};
        //     renderLayout(layout.intermediate(), false, endCallback);
        // } else if (userState.perspective === 'overview' && userState.preserveViewport === 'detail'){
        //     endCallback = function() {console.log('rendered overview from detail'); renderLayout(layout.detail(), false);};
        //     renderLayout(targetLayout, true, endCallback);
        // } else {
        //     renderLayout(targetLayout, true);
        // }

        // disable events during transition
        // Set layout according to perspective, viewingMode,
        // and viewingDirection.
        // overview->intermediate=>then
        // var targetLayout = layout[userState.perspective]();

        if (userState.perspective === 'detail' && userState.previousPerspective === 'overview') {
            // var endCallback = function() {
            //     console.log('rendered overview from detail');
            //     renderLayout(layout.overview(), true);
            // };
            renderLayout(layout.intermediate(), false);//, endCallback);
        } else if (userState.perspective === 'overview' && userState.preserveViewport === 'detail'){
            var endCallback = function() {
                console.log('rendered overview from detail');
                renderLayout(layout.overview(), false);
            };
            renderLayout(layout.intermediate(), true);//, endCallback);
            } else if (userState.perspective === 'detail' && userState.perspective === 'detail'){
                renderLayout(layout.intermediate(), false);
            } else {
                renderLayout(layout.overview(), true);
            }

        // renderLayout(layout.intermediate(), true);

        // calculate and zoom to new bounds (if relevant)
        // Set appropriate events for mode.

        if (userState.perspective === 'detail') {
            var viewBounds = layout.intermediate().filter(function(frame) {
                return frame.canvas.selected;
            })[0].vantage;

            console.log(viewBounds);

            var osdBounds = new OpenSeadragon.Rect(viewBounds.x, viewBounds.y, viewBounds.width, viewBounds.height);

            viewer.viewport.fitBounds(osdBounds, false);
        } else {
            viewBounds = new OpenSeadragon.Rect(0,0, canvasState().width, canvasState().height);
            viewer.viewport.fitBounds(viewBounds, false);
        }
    }

    function canvasImageStates(state) {

        if (!arguments.length) return _canvasImageStates;
        _canvasImageStates = state;

        // if (!initial) {
        //     jQuery.publish('annotationsTabStateUpdated' + this.windowId, this.tabState);
        // }

        return _canvasImageStates;
    }

    // function detailTransition(detailLayout) {
    //     renderLayout(detailLayout);
    // }
    // function overviewTransition(selection) {
    //     renderLayout(detailLayout);
    // }

    function renderLayout(layoutData, animate, callback) {
        // To understand this render function,
        // you need a general understanding of d3 selections,
        // and you will want to read about nested
        // selections in particular: http://bost.ocks.org/mike/nest/

        var interactionOverlay = d3.select(overlays[0]),
            animationTiming = animate ? 1000 : 0;

        if (canvasState().perspective === 'detail') {
            interactionOverlay
                .transition()
                .duration(animationTiming)
                .style('pointer-events', 'none')
                .style('opacity', 0);

            d3.select(scrollContainer[0])
                .transition()
                .duration(animationTiming)
                .style('pointer-events', 'none')
                .style('overflow-x', 'hidden')
                .style('overflow-y', 'hidden');
        } else {
            interactionOverlay
                .transition()
                .duration(animationTiming)
                .style('pointer-events', 'all')
                .style('opacity', 1);

            d3.select(scrollContainer[0])
                .transition()
                .duration(animationTiming)
                .style('pointer-events', 'all')
                .style('overflow-x', 'hidden')
                .style('overflow-y', 'scroll');
        }
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

        var frame = interactionOverlay.selectAll('.frame')
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
                .call(endall, function() { if (callback) { callback(); }});

        frame.select('.canvas')
            .style('width', function(d) { return d.canvas.width + 'px'; })
            .style('height', function(d) { return d.canvas.height + 'px'; })
            .attr('class', function(d) {
                var selected = d.canvas.selected;
                return selected ? 'canvas selected' : 'canvas';
            });

        var frameEnter = frame
                .enter().append('div')
                .attr('class', 'frame')
                .style('width', function(d) { return d.width + 'px'; })
                .style('height', function(d) { return d.height + 'px'; })
                .style('transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; })
                .style('-webkit-transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; });

        frameEnter
            .append('div')
            .attr('class', function(d) {
                var selected = d.canvas.selected;
                return selected ? 'canvas selected' : 'canvas';
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
            .append('h4').text(function(d) { return d.canvas.label; });

    };

    function endall(transition, callback) {
        var n = 0;
        if (transition.empty()) {callback();} else {
            transition
                .each(function() { ++n; })
                .each("end", function() { if (!--n) callback.apply(this, arguments); });
        }
    }

    function translateTilesources(d, i) {
        var canvasId = d.canvas.id,
            dummyObj = canvasImageStates()[canvasId].dummyObj;

        var currentBounds = dummyObj.getBounds(true),
            xi = d3.interpolate(currentBounds.x, d.canvas.x),
            yi = d3.interpolate(currentBounds.y, d.canvas.y);

        return function(t) {
            dummyObj.setPosition(new OpenSeadragon.Point(xi(t), yi(t)), true);
            dummyObj.setWidth(d.canvas.width, true);
            dummyObj.setHeight(d.canvas.height, true);
        };
    }

    function updateImages(d) {
        var canvasData = d.canvas,
            canvasImageState = canvasImageStates()[canvasData.id];

        if (canvasState().perspective === 'detail' && canvasState().selectedCanvas === canvasData.id) {
            substitute(canvasData, canvasImageState.dummyObj, canvasImageState.tileSourceUrl);
        }
    }

    function substitute(canvasData, dummyObj, tileSourceUrl) {
        viewer.addTiledImage({
            x: canvasData.x,
            y: canvasData.y,
            width: canvasData.width,
            tileSource: tileSourceUrl,
            index: 0, // Add the new image below the stand-in.
            success: function(event) {
                var fullImage = event.item;

                // The changeover will look better if we wait for the first tile to be drawn.
                var tileDrawnHandler = function(event) {
                    if (event.tiledImage === fullImage) {
                        viewer.removeHandler('tile-drawn', tileDrawnHandler);
                        fade(dummyObj, 0, function() { viewer.world.removeItem(dummyObj); });
                    }
                };

                viewer.addHandler('tile-drawn', tileDrawnHandler);
            }
        });
    }

    function enterImages(d) {

        var canvasData = d.canvas,
            canvasImageState = canvasImageStates()[canvasData.id];

        var dummy = {
            type: 'legacy-image-pyramid',
            levels: [
                {
                    url: canvasData.thumbService + '/full/' + Math.ceil(d.canvas.width * 2) + ',/0/default.jpg',
                    width: canvasData.width,
                    height: canvasData.height
                }
            ]
        };

        viewer.addTiledImage({
            tileSource: dummy,
            x: canvasData.x,
            y: canvasData.y,
            width: canvasData.width,
            success: function(event) {
                addDummyObj(canvasData.id, event.item);
            }
        });

        if (canvasState().perspective === 'detail' && canvasState().selectedCanvas === canvasData.id) {
            substitute(canvasData, canvasImageState.dummyObj, canvasImageState.tileSourceUrl);
        }
    }

    function fade(image, targetOpacity, callback) {
        var currentOpacity = image.getOpacity();
        var step = (targetOpacity - currentOpacity) / 10;
        if (step === 0) {
            callback();
            return;
        }

        var frame = function() {
            currentOpacity += step;
            if ((step > 0 && currentOpacity >= targetOpacity) || (step < 0 && currentOpacity <= targetOpacity)) {
                image.setOpacity(targetOpacity);
                callback();
                return;
            }

            image.setOpacity(currentOpacity);
            OpenSeadragon.requestAnimationFrame(frame);
        };
        OpenSeadragon.requestAnimationFrame(frame);
    };

    function removeImages(d) {
    }

    function initOSD() {
        viewer = OpenSeadragon({
            element: osdContainer[0],
            autoResize: true,
            showNavigationControl: false,
            preserveViewport: true
        });

        $(viewer.container).css('position', 'absolute');

        // viewer.addHandler('animation', function(event) {
        //     // if (canvasState().perspective === 'detail') {
        //         synchroniseZoom();
        //     // }
        // });
    };

    function synchroniseZoom() {
        var viewerWidth = viewer.container.clientWidth;
        var viewerHeight = viewer.container.clientHeight;
        var center = viewer.viewport.getCenter(true);
        var p = center.minus(new OpenSeadragon.Point(viewerWidth / 2, viewerHeight / 2));
        var zoom = viewer.viewport.getZoom(true);
        var scale = viewerWidth * zoom;

        var transform = 'scale(' + scale + ') translate(' + -p.x + 'px,' + -p.y + 'px)';

        d3.select(overlays[0])
            .style('transform', transform)
            .style('-webkit-transform', transform);
    }

    function synchronisePan(panTop, width, height) {
        console.log(panTop);
        var x = width/2;
        var y = panTop + height/2;
        viewer.viewport.panTo(new OpenSeadragon.Point(x,y), true);
    }

    function selectCanvas(item) {
        var state = canvasState();
        state.selectedCanvas = item;
        state.perspective = 'detail';
        canvasState(state);
    }

    function selectPerspective(perspective) {
        var state = canvasState();
        state.previousPerspective = state.perspective;
        state.perspective = perspective;
        canvasState(state);
    }

    function selectViewingMode(viewingMode) {
        var state = canvasState();
        state.viewingMode = viewingMode;

        canvasState(state);
    }

    function refreshState(newState) {
        var state = canvasState();

        // for blah in blah overwrite blah
        // rather than just setting a specific
        // property.
        canvasState(state);
    }

    function addImageCluster(id) {
        var canvases = canvasImageStates();

        canvases[id] = {
        };
    }

    function addDummyObj(id, osdTileObj) {
        var canvasStates = canvasImageStates();

        canvasStates[id].dummyObj = osdTileObj;

        canvasImageStates(canvasStates);
    }

    function buildCanvasStates(canvases) {
        var canvasStates = {};

        canvases.forEach(function(canvas) {
            console.log(canvas);
            canvasStates[canvas['@id']] = {
                tileSourceUrl: canvas.images[0].resource.service['@id'] + '/info.json'
            };
        });

        canvasImageStates(canvasStates);
    }

    function resize() {
        var state = canvasState();

        state.width = container.width();
        state.height = container.height();

        canvasState(state);
    }

    function updateThumbSize(scaleFactor) {
        var state = canvasState();

        state.scaleFactor = scaleFactor;

        canvasState(state);
    }

    container.on('click', '.canvas', function(event) {
        selectCanvas($(this).data('id'));
    });
    scrollContainer.on('scroll', function(event) {
        if (canvasState().perspective === 'overview') {
            synchronisePan($(this).scrollTop(), $(this).width(), $(this).height());
        }
    });

    return {
        // selectMode: selectMode,
        // selectPerspective: selectPerspective,
        // next: next,
        // previous: previous,
        // scrollThumbs: scrollThumbs,
        resize: resize,
        selectCanvas: selectCanvas,
        selectPerspective: selectPerspective,
        selectViewingMode: selectViewingMode,
        updateThumbSize: updateThumbSize,
        refreshState: refreshState
    };

};

module.exports = manifestor;
