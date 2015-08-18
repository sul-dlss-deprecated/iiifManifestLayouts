'use strict';

var $ = require('jquery');
var d3 = require('d3');
var osd = require('./openseadragon');
var manifestLayout = require('./manifestLayout');

var manifest,
    container,
    _canvasState;

$.get('http://purl.stanford.edu/fw090jw3474/iiif/manifest.json', function(data) {
    manifest = data;
    initOSD();
    canvasState({
        selectedItem: null, // @id of the canvas:
        focus: 'overview', // can be 'overview' or 'detail'
        viewingMode: 'single' // manifest derived or user specified (iiif viewingHint)
    });
});


var manifestStore = function() {
    // Event Handlers (receiving objects from)
    // action creation; no public setters allowed.

    function requestComplete() {
    }

    function requestPending() {
    }

    function sequenceAdded() {
    }

    function rangeAdded() {
    }

    function canvasAdded() {
    }

    function resourceAdded() {
    }

    return {
        registerForChange: registerForChange
    };
};

container = $('#d3-example');

function render() {
    renderManifest(manifest);
    renderOSD(manifest, 'left-to-right', viewer);
}

function canvasState(state) {

    if (!arguments.length) return _canvasState;
    _canvasState = state;

    // if (!initial) {
    //     jQuery.publish('annotationsTabStateUpdated' + this.windowId, this.tabState);
    // }

    render();
}

function getData() {
    var userState = canvasState();

    var layoutData = manifestLayout({
        canvases: manifest.sequences[0].canvases,
        width: container.width(),
        height: container.height(),
        viewingDirection: userState.viewingd || 'left-to-right',
        frameHeight: 100,
        frameWidth: 100,
        selectedCanvas: userState.selectedItem,
        vantagePadding: {
            top: 10,
            bottom: 40,
            left: 5,
            right: 5
        }
    });

    // console.log(layoutData);
    return layoutData;
}

function renderManifest() {
    var layoutData = getData();
    // To understand this layout, read: http://bost.ocks.org/mike/nest/
    var interactionOverlay = d3.select('#overlays');
    var vantage = interactionOverlay.selectAll('.vantage')
            .data(layoutData);

    var vantageUpdated = vantage
            .style('width', function(d) { return d.width + 'px'; })
            .style('height', function(d) { return d.height + 'px'; })
            .transition()
            .duration(1100)
            .ease('cubic-out')
            .styleTween('transform', function(d) {
                return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
            })
            .styleTween('-webkit-transform', function(d) {
                return d3.interpolateString(this.style.transform, 'translate(' + d.x +'px,' + d.y + 'px)');
            }).each(updateTile);

    var vantageEnter = vantage
            .enter().append('div')
            .attr('class', 'vantage')
            .style('width', function(d) { return d.width + 'px'; })
            .style('height', function(d) { return d.height + 'px'; })
            .style('transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; })
            .style('-webkit-transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; });

    vantageEnter
        .append('div')
        .attr('class', function(d) {
            var selected = d.frame.selected;
            return selected ? 'frame selected' : 'frame';
        })
        .attr('data-id', function(d) {
            return d.frame.id;
        })
        .style('width', function(d) { console.log(d); return d.frame.width + 'px'; })
        .style('height', function(d) { return d.frame.height + 'px'; })
        .style('transform', function(d) { return 'translateX(' + d.frame.localX + 'px) translateY(' + d.frame.localY + 'px)'; })
        .each(enterTile);
        // .append('img')
        // .attr('src', function(d) { return d.frame.iiifService + '/full/' + Math.ceil(d.frame.width * 2) + ',/0/default.jpg';});

    vantageEnter
        .append('h4').text(function(d) { return d.frame.label; });
};

function updateTile(d) {
}

function enterTile(d) {
    console.log(d);
    console.log('running');
    var frameData = d.frame;

    var dummy = {
        type: 'legacy-image-pyramid',
        levels: [
            {
                url: frameData.iiifService + '/full/' + Math.ceil(d.frame.width * 2) + ',/0/default.jpg',
                width: frameData.width,
                height: frameData.height
            }
        ]
    };

    viewer.addTiledImage({
        tileSource: dummy,
        x: frameData.x,
        y: frameData.y,
        width: frameData.width
    });
}

var renderOSD = function() {
    var layoutData = getData(),
        viewBounds =  layoutData.filter(function(vantage){
            return vantage.frame.selected;
        });

    if (viewBounds.length !== 0 && canvasState().focus === 'detail') {
        viewBounds = new OpenSeadragon.Rect(
            viewBounds[0].frame.x,
            viewBounds[0].frame.y,
            viewBounds[0].frame.width,
            viewBounds[0].frame.height
        );
    } else {
        viewBounds = new OpenSeadragon.Rect(0,0, container.width(), container.height());
    }

    viewer.viewport.fitBounds(viewBounds, false);
};

var initOSD = function() {
    window.viewer = OpenSeadragon({
        id: "osd-container",
        autoResize:true,
        showNavigationControl: false,
        preserveViewport: true
    });

    viewer.addHandler('animation', function(event) {
        synchroniseZoom();
    });
};

function synchroniseZoom() {
    var p = viewer.viewport.pixelFromPoint(new OpenSeadragon.Point(0, 0), true);
    var zoom = viewer.viewport.getZoom(true);
    var scale = viewer.container.clientWidth * zoom;

    console.log($('#overlays').width() + ', ' + viewer.container.clientWidth + ', ' + $('#d3-example').width());
    console.log(scale);
    console.log(p.x);
    console.log(p.y);

    var transform = 'translate(' + -p.x + 'px,' + -p.y + 'px) scale(' + scale + ')';
    var origin = '50% 50%';

    d3.select('#overlays')
        .style('transform', transform)
        .style('-webkit-transform', transform)
        .style('transform-origin', origin)
        .style('-webkit-transform-origin', origin);
}

var actions = [
    'pan',
    'zoom',
    'changePage',
    'next',
    'previous',
    'scrollThumbs',
    'hoverCanvas',
    'selectMode',
    'windowResize',
    'elementResize',
    'requestTilesource',
    'tileSourceFinishedLoading'
];

function selectItem(item) {
    var state = canvasState();
    state.selectedItem = item;
    state.focus = 'detail';

    canvasState(state);
}

$(window).on('resize', function() {
    renderManifest(manifest, $('readingDirection').val());
});

$('#readingDirection').on('change', function() {
    renderManifest(manifest, $(this).val());
    renderOSD(manifest, 'left-to-right', viewer);
});

container.on('click', '.frame', function(event) {
    selectItem($(this).data('id'));
});

$('#scale').on('input', function() {
    renderManifest(manifest, $(this).val());
});
