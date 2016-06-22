var App = {
  // ----------
  init: function() {
    var self = this;

    this.currentMode = 'individuals';

    this.$manifestPicker = $('#manifestPicker');
    this.$images = $('#images-list');

    this.$images.empty();

    // Some choice fixture objects with real content.
   [
   {url: 'http://demos.biblissima-condorcet.fr/iiif/metadata/BVMM/chateauroux/manifest.json', label: 'BNF Detail Images Demo (Chateauroux)'},
   {url:'http://manifests.ydc2.yale.edu/manifest/Osbornfa1v2.json', label: "Yale Osborn with choice (see 53r)"},
   {url: 'http://dms-data.stanford.edu/data/manifests/BnF/jr903ng8662/manifest.json', label: 'Stanford DMS Manuscript (example of typical object)'},
   {url: 'http://iiif.ub.uni-leipzig.de/0000000001/manifest.json', label: 'Leipzig Scroll'}
   ].forEach(function(fixture) {
    $('<option>')
      .val(fixture.url)
      .text(fixture.label)
      .appendTo(App.$manifestPicker);
   });

    this.openSelectedManifest();

    $.get('http://iiif.io/api/presentation/2.0/example/fixtures/collection.json', function(fixtureCollection) {
      fixtureCollection.manifests.forEach(function(manifest) {
        var option = $('<option>').val(manifest['@id']).text(manifest.label);
        self.$manifestPicker.append(option);
      });
    });

    $('#manifestPicker').on('change', function() {
      self.openSelectedManifest();
    });

    $('#mode').on('change', function(e) {
      self.currentMode = e.target[e.target.selectedIndex].value;
      if (self.viewer) {
        self.viewer.selectViewingMode(self.currentMode);
      }
    });

    $('#readingDirection').on('change', function(e) {
      var value = e.target[e.target.selectedIndex].value;
      if (self.viewer) {
        self.viewer.selectViewingDirection(value);
      }
    });

    $('#scale').on('input', function() {
      // must be a value between 0.5 and 2;
      // input is between 50 and 200, so
      // we must convert.
      if (self.viewer) {
        self.viewer.updateThumbSize($(this).val()*(1/100));
      }
    });

    key('m', function() {
      self.cycleViewingModes();
    });

    key('h, left', function() {
      if (self.viewer) {
        self.viewer.previous();
      }
    });

    /*          key('j, down') */ // Implement nearest Neighbour Search
    /*          key('k, up') */   // Might be easiest if the lines were
    // saved somewhere.
    key('l, right', function() {
      if (self.viewer) {
        self.viewer.next();
      }
    });

    $(window).on('resize', function() {
      if (self.viewer) {
        self.viewer.resize();
      }
    });
  },

  // ----------
  openSelectedManifest: function() {
    var self = this;

    var manifestUrl = this.$manifestPicker.val();
    this.$images.empty();

    $.get(manifestUrl, function(manifest) {
      /* http://iiif.io/api/presentation/2.0/example/fixtures/24/manifest.json */
      /* http://dms-data.stanford.edu/data/manifests/BnF/jr903ng8662/manifest.json */

      if (self.viewer) {
        self.viewer.destroy();
      }

      self.viewer = manifestor({
        manifest: manifest,
        container: $('#example-container'),
        perspective:  'overview',
        canvasClass: 'canvas', //default set to 'canvas'
        frameClass: 'frame', //default set to 'frame'
        labelClass: 'label', //default set to 'label'
        viewportPadding: {  // in detail view, make sure this area is clear
          top: 0,
          left: 10,
          right: 10,
          bottom: 20 // units in % of pixel height of viewport
        },
        // selectedCanvas: manifest.sequences[0].canvases[50]['@id']
      });

      self.viewer.selectViewingMode(self.currentMode);

      // Debug/example code: Listen for tile source requests and loads
      self.viewer.on('detail-tile-source-requested', function(e) {
        // console.log('detail tile source requested', e.detail);
      });
      self.viewer.on('viewer-state-updated', function() {
        console.log('I have updated!');
      });

      $('#example-container').on('click', '.canvas', function (event) {
        self.viewer.selectCanvas($(this).data('id'));
      });

      self.$images.sortable({
        stop: function(event, ui) {
          var images = self.selectedCanvas.images.length;
          var i = 0;
          for(i; i < images.length; i++) {

            // zIndex is backwards from this UI; 0 is on the bottom for zIndex, but 0 is the top
            // of this sortable UI element array.
            var image = self.selectedCanvas.getImageById(images[i].id);
            self.selectedCanvas.moveToIndex(image, images.length - (i + 1));
          }
        }
      });

      var _setCheckbox = function(id, value) {
        var checkbox = $('#' + id);
        checkbox.prop('checked', value);
      };

      self.viewer.on('image-hide', function(e) {
        _setCheckbox(e.detail, false);
      });

      self.viewer.on('image-show', function(e) {
        _setCheckbox(e.detail, true);
      });

      self.viewer.on('image-resource-tile-source-opened', function(e) {
        _setCheckbox(e.detail.id, e.detail.visible);
      });

      var _setImagesForCanvas = function(canvas) {
        self.selectedCanvas = canvas;
        self.$images.empty();

        console.log(selectedCanvas);
        window.selectedCanvas = selectedCanvas;

        self.selectedCanvas.images.forEach(function(image) {
          console.log(image);
          var text = image.label;
          if(image.imageType === 'main') {
            text += " (default)";
          }
          if(image.imageType === 'detail') {
            text +=" (detail)";
          }

          var listItem = $('<li>');
          var layerThumb = $('<img class="layerthumb">');
          var label = $('<h3 class="layerName">').append('<span>'+text+'</span>');
          var slider = $('<input class="opacitySlider" type="range" min="0" max="100" step="2" value="100">');
          // var sliderLabel = $('<label>').text('Opacity');

          var checkbox = $('<input type=checkbox>');
          checkbox.prop('id', image.id);
          checkbox.prop('checked', image.visible);

          checkbox.change(image, function(event) {
            console.log('checked');
            console.log(image.status);
            console.log(event.target.checked);
            console.log(image.visible);
            if(event.target.checked) {
              if(image.status === 'shown') {
                image.show();
              } else {
                self.selectedCanvas.removeThumbnail();
                image.openTileSource();
              }
            } else {
              console.log('nothing to hide apparently');
              console.log(image);
              image.hide();
            }
          });

          slider.on('input', function(event) {
            var opacity = $(this).val();

            image.setOpacity(opacity/100);
          });
          listItem.append(label);
          listItem.prepend(layerThumb);
          listItem.prepend(checkbox);
          // listItem.append(sliderLabel);
          label.append(slider);
          listItem.prependTo(self.$images);
        });
      };

      var selectedCanvas = self.viewer.getSelectedCanvas();

      if(selectedCanvas && self.viewer.getState().perspective == 'detail') {
        _setImagesForCanvas(selectedCanvas);
      }

      self.viewer.on('canvas-selected', function(event) {
        _setImagesForCanvas(self.viewer.getSelectedCanvas());
      });

      key('shift+j', function() {
        if (self.viewer) {
          self.viewer.selectPerspective('detail');
          var selectedCanvas = self.viewer.getSelectedCanvas();
          if(selectedCanvas) {
            _setImagesForCanvas(selectedCanvas);
          }
        }
        console.log('shifting to detail perspective');
      });

      key('shift+k', function() {
        if (self.viewer) {
          self.viewer.selectPerspective('overview');
          self.$images.empty();
        }
        console.log('shifting to overview perspective');
      });
    });
  },

  // ----------
  cycleViewingModes: function() {
    var newMode;
    if (this.currentMode === 'individuals') {
      newMode = 'paged';
    } else if (this.currentMode === 'paged'){
      newMode = 'continuous';
    } else if (this.currentMode === 'continuous'){
      newMode = 'individuals';
    }

    this.currentMode = newMode;
    $('#mode').val(this.currentMode);

    if (this.viewer) {
      this.viewer.selectViewingMode(newMode);
    }
  }
};

// ----------
App.init();
