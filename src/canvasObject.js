'use strict';

var _ = require('underscore');

var defaults = {
    needed: false,
    visible: true,
    clipRegion: null,
    opacity: 1,
    position: {
        x: 0,
        y: 0,
    },
    placeholder: '/some-image.jpg',
};
var canvasObject= function(canvas) {
    canvas.tileSourceUrl = canvas.images[0].resource.service['@id'] + '/info.json';
    return _.defaults(canvas, defaults);
};

module.exports = canvasObject;
