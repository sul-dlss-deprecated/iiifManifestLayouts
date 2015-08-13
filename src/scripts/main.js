'use strict';

var $ = require('jquery');
var d3 = require('d3');
var osd = require('./openseadragon');
var manifestLayout = require('./manifestLayout');

var manifest,
    viewer;

// D3 example
$.get('http://purl.stanford.edu/fw090jw3474/iiif/manifest.json', function(data) {
    manifest = data;
    initOSD();
    // renderManifest(manifest);
    renderOSD(manifest);
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

function renderManifest(manifest, viewingd) {
    var container = $('#d3-example');
    console.log(manifest);

    var layoutData = manifestLayout({
        canvases: manifest.sequences[0].canvases,
        width: container.width(),
        height: container.height(),
        viewingDirection: viewingd || 'right-to-left',
        frameHeight: 100,
        frameWidth: 100,
        vantagePadding: {
            top: 10,
            bottom: 40,
            left: 5,
            right: 5
        }
    });

    console.log(layoutData);

    var interactionOverlay = d3.select('#d3-example');

    // To understand this layout, read: http://bost.ocks.org/mike/nest/
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
            });

    var vantageEnter = vantage
            .enter().append('div')
            .attr('class', 'vantage')
            .style('width', function(d) { return d.width + 'px'; })
            .style('height', function(d) { return d.height + 'px'; })
            .style('transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; })
            .style('-webkit-transform', function(d) { return 'translate(' + d.x + 'px,' + d.y + 'px)'; });

    vantageEnter
        .append('div')
        .attr('class', 'frame')
        .style('width', function(d) { console.log(d); return d.frame.width + 'px'; })
        .style('height', function(d) { return d.frame.height + 'px'; })
        .style('transform', function(d) { return 'translateX(' + d.frame.localX + 'px) translateY(' + d.frame.localY + 'px)'; })
        .append('img')
        .attr('src', function(d) { return d.frame.iiifService + '/full/' + Math.ceil(d.frame.width * 2) + ',/0/default.jpg';});

    vantageEnter
        .append('h4').text(function(d) { return d.frame.label; });
};

var renderOSD = function(manifest, viewingd) {
    var container = $('#d3-example');
    console.log(manifest);

    var layoutData = manifestLayout({
        canvases: manifest.sequences[0].canvases,
        width: container.width(),
        height: container.height(),
        viewingDirection: viewingd || 'right-to-left',
        frameHeight: 100,
        frameWidth: 100,
        vantagePadding: {
            top: 10,
            bottom: 40,
            left: 5,
            right: 5
        }
    });

    console.log(layoutData);
};

var initOSD = function() {
    viewer = OpenSeadragon({
        id: "osd-container",
        autoResize:true,
        showNavigationControl: false,
        preserveViewport: true
    });
};

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

$(window).on('resize', function(){renderManifest(manifest, $('readingDirection').val());});

$('#readingDirection').on('change', function() {
    renderManifest(manifest, $(this).val());
});

$('#scale').on('input', function() {
    renderManifest(manifest, $(this).val());
});
