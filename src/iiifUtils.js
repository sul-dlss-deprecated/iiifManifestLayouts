'use strict';

var iiifUtils = {
    /**
     * Returns the first canvas for a given array of canvases
     * @param {Object[]} canvases
     * @returns {String}
     */
    getFirst: function(canvases) {
      return canvases[0]['@id'];
    },

    getImageUrl: function(image) {

        if (!image.images[0].resource.service) {
            id = image.images[0].resource['default'].service['@id'];
            id = id.replace(/\/$/, "");
            return id;
        }

        var id = image.images[0].resource.service['@id'];
        id = id.replace(/\/$/, "");

        return id;
    },

    getVersionFromContext: function(context) {
        if (context == "http://iiif.io/api/image/2/context.json") {
            return "2.0";
        } else {
            return "1.1";
        }
    },

    makeUriWithWidth: function(uri, width, version) {
        uri = uri.replace(/\/$/, '');
        if (version[0] == '1') {
            return uri + '/full/' + width + ',/0/native.jpg';
        } else {
            return uri + '/full/' + width + ',/0/default.jpg';
        }
    },

    getThumbnailForCanvas : function(canvas, dimensions) {
      var version = "1.1",
      service,
      thumbnailUrl;

      // Ensure width is an integer...
        dimensions.forEach(function(dimension) {
            parseInt(dimension, 10);
        });

      // Respecting the Model...
      if (canvas.hasOwnProperty('thumbnail')) {
        // use the thumbnail image, prefer via a service
        if (typeof(canvas.thumbnail) == 'string') {
          thumbnailUrl = canvas.thumbnail;
        } else if (canvas.thumbnail.hasOwnProperty('service')) {
          // Get the IIIF Image API via the @context
          service = canvas.thumbnail.service;
          if (service.hasOwnProperty('@context')) {
            version = this.getVersionFromContext(service['@context']);
          }
            thumbnailUrl = this.makeUriWithWidth(service['@id'], width, version);
        } else {
          thumbnailUrl = canvas.thumbnail['@id'];
        }
      } else {
        // No thumbnail, use main image
        var resource = canvas.images[0].resource;
        service = resource['default'] ? resource['default'].service : resource.service;
        if (service.hasOwnProperty('@context')) {
            version = this.iiif.getVersionFromContext(service['@context']);
        }
          thumbnailUrl = this.iiif.makeUriWithWidth(service['@id'], width, version);
      }
      return thumbnailUrl;
    }
};

module.exports = iiifUtils;
