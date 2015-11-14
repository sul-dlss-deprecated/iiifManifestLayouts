'use strict';

var canvasObject= function(canvas) {
	return {
		needed: false,
		visible: true,
		clipRegion: null,
		opacity: 1,
		position: {
			x: 0,
			y: 0,
		},
		placeholder: '/some-image.jpg',
        tileSourceUrl: canvas.images[0].resource.service['@id'] + '/info.json',
      }
};

module.exports = canvasObject;