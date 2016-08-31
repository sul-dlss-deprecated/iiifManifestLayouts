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
      {url: 'http://dms-data.stanford.edu/data/manifests/BnF/jr903ng8662/manifest.json', label: 'Stanford DMS Manuscript (example of typical object)'},
      {url: 'http://demos.biblissima-condorcet.fr/iiif/metadata/BVMM/chateauroux/manifest.json', label: 'BNF Detail Images Demo (Chateauroux)'},
      {url:'http://manifests.ydc2.yale.edu/manifest/Osbornfa1v2.json', label: "Yale Osborn with choice (see 53r)"},
      {url: 'http://iiif.ub.uni-leipzig.de/0000000001/manifest.json', label: 'Leipzig Scroll'},
      {url: 'http://oculus-dev.harvardx.harvard.edu/manifests/drs:5981093', label: 'Harvard Richardson 7'},
      {url: 'https://data.ucd.ie/api/img/manifests/ucdlib:33064', label: 'University College Dublin (dcterms)'},
      {url: 'http://www2.dhii.jp/nijl/NIJL0018/099-0014/manifest_tags.json', label: 'National Institute of Japanese Literature (rtl)'},
      {url: 'http://digi.vatlib.it/iiif/MSS_Vat.lat.3225/manifest.json', label: 'Vatican Library (URL formatting)'},
      {url: 'http://media.nga.gov/public/manifests/nga_highlights.json', label: 'NGA Highlights'}
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

    $(window).on('resize', function() {
      if (self.viewer) {
        self.viewer.resize();
      }
    });

    $('#manifestPicker').on('change', function(e) {
      self.openSelectedManifest();
    });

    $('button.next').on('click', function(e) {
      self.viewer.next();
    });

    $('button.previous').on('click', function(e) {
      self.viewer.previous();
    });

    $('#perspective').on('change', function(e) {
      self.currentPerspective = e.target[e.target.selectedIndex].value;
      if (self.viewer) {
        self.viewer.selectPerspective(self.currentPerspective);
      }
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

    key('l, right', function() {
      if (self.viewer) {
        self.viewer.next();
      }
    });

    key('shift+j', function() {
      if (self.viewer) {
        self.viewer.selectPerspective('detail');
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

    $(window).on('resize', function() {
      if (self.viewer) {
        self.viewer.resize();
      }
    });
  },

  openSelectedManifest: function() {
    var self = this;

    var manifestUrl = this.$manifestPicker.val();
    this.$images.empty();

    $.get(manifestUrl, function(manifest) {
      /* http://iiif.io/api/presentation/2.0/example/fixtures/24/manifest.json */
      /* http://dms-data.stanford.edu/data/manifests/BnF/jr903ng8662/manifest.json */

      // if (self.viewer) {
      //   self.viewer.canvases(manifest.sequences[0].canvases);
      //   return;
      // }

      if (self.viewer) {
        self.viewer.destroy();
      }

      self.viewer = manifestor({
        manifest: manifest,
        container: $('#example-container')[0],
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
        selectedCanvas: manifest.sequences[0].canvases[0]['@id']
      });

      var selectedCanvas = self.viewer.getSelectedCanvas();

      if(selectedCanvas && self.viewer.getState().perspective == 'detail') {
        setImagesForCanvas(selectedCanvas);
      }

      $('#example-container').on('click', '.canvas', function (event) {
        self.viewer.selectCanvas($(this).data('id'));
      });

      $('.scrollContainer').on('scroll', function(event) {
        self.viewer.setScrollPosition(this.scrollTop);
      });

      // function enableDetailContinuousScrollEvents(viewingDirection) {
      //   scrollContainer
      //     .style('pointer-events', 'all');

      //   if (viewingDirection === 'right-to-left' || viewingDirection === 'left-to-right') {
      //     scrollContainer
      //       .style('overflow-x', 'scroll')
      //       .style('overflow-y', 'hidden');
      //     return;
      //   } else {
      //     scrollContainer
      //       .style('overflow-x', 'hidden')
      //       .style('overflow-y', 'scroll');
      //     return;
      //   }
      // }


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
        var checkbox = $('#' + id).find('input[type=checkbox]');
        checkbox.prop('checked', value);
      };

      self.viewer.on('image-hide', function(e) {
        _setCheckbox(e.id, e.getVisible());
      });

      self.viewer.on('image-show', function(e) {
        _setCheckbox(e.id, e.getVisible());
      });

      self.viewer.on('image-status-updated', function(imageResource) {
        setImagesForCanvas(self.viewer.getSelectedCanvas());
      });

      function setImagesForCanvas(canvas) {
        self.selectedCanvas = canvas;
        self.$images.empty();

        window.selectedCanvas = selectedCanvas;

        self.selectedCanvas.images.forEach(function(image) {
          var text = image.label;
          if(image.imageType === 'main') {
            text += " (default)";
          }
          if(image.imageType === 'detail') {
            text +=" (detail)";
          }

          var listItem = $('<li>');
          listItem.prop('id', image.id);
          var layerThumb = $('<img class="layerthumb">');
          var label = $('<h3 class="layerName">').append('<span>'+text+image.getStatus()+'</span>');
          var slider = $('<input class="opacitySlider" type="range" min="0" max="100" step="2" value="100">');
          slider.val(image.getOpacity() * 100);
          // var sliderLabel = $('<label>').text('Opacity');
          var checkbox = $('<input type=checkbox>');
          checkbox.prop('checked', image.getVisible());

          checkbox.on('change', function(event) {
            if(event.target.checked) {
              image.show();
            } else {
              image.hide();
            }
          });

          slider.on('input', function(event) {
            var opacity = $(this).val();

            image.setOpacity(opacity/100);
          });
          listItem.append(label);
          listItem.prepend(layerThumb);
          if (image.getStatus() === 'drawn') {
            layerThumb.attr('src', image.tileSource.url);
          }
          listItem.prepend(checkbox);
          // listItem.append(sliderLabel);
          label.append(slider);
          listItem.prependTo(self.$images);
        });
      };

      self.viewer.on('canvas-selected', function(event) {
        setImagesForCanvas(self.viewer.getSelectedCanvas());
      });

    });
  },

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
