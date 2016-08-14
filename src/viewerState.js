var CanvasObject = require('./canvasObject');

var viewerState = function(config) {
  var dispatcher = config.dispatcher,
      canvases = config.sequence ? config.sequence.canvases : config.manifest.sequences[0].canvases,
      state = {
        canvases : canvases,
        canvasObjects : buildCanvasObjects(canvases),
        selectedCanvas : config.selectedCanvas || canvases[0]['@id'], // @id of the canvas:
        perspective : config.perspective ? config.perspective : 'overview',
        viewingMode : config.viewingMode ? config.viewingHint : getViewingHint(config.sequence, config.manifest), // manifest derived or user specified (iiif viewingHint)
        viewingDirection : config.viewingDirection ? config.viewingDirection : getViewingDirection(config.sequence, config.manifest), // manifest derived or user specified (iiif viewingHint)
        width : config.width,
        height : config.height,
        framePadding : config.framePadding,
        viewportPadding : config.viewportPadding,
        minimumImageGap : config.viewportPadding,
        facingCanvasPadding : config.facingCanvasPadding
      };

  function getViewingDirection(sequence, manifest) {
    if (sequence && sequence.viewingDirection) {
      return sequence.viewingDirection;
    }
    return manifest.viewingDirection ? manifest.viewingDirection : 'left-to-right';
  }

  function getViewingHint(sequence, manifest) {
    if (sequence && sequence.viewingHint) {
      return sequence.viewingHint;
    }
    return manifest.viewingHint ? manifest.viewingHint : 'individuals';
  }

  function buildCanvasObjects(canvases) {
    var canvasObjects = [];

    canvases.forEach(function(canvas, index) {
      var canvasObject = new CanvasObject({
        canvas: canvas,
        index: index,
        dispatcher: dispatcher
      });
      canvasObjects.push(canvasObject);
      canvasObjects[canvas['@id']] = canvasObject;
    });

    return canvasObjects;
  }

  function getState() {
    return state;
  }

  function setState(newState, actionType) {
    console.log('started');
    var differences = {};
    for(var key in newState) {
      if(newState.hasOwnProperty(key)) {
        if(state[key] !== newState[key]) {
          differences[key] = state[key];
          state[key] = newState[key];
        }
      }
    }
    dispatcher.emit('viewer-state-updated-details', {
      detail: differences,
      actionType: actionType
    });
  }

  function selectedCanvasObject(newCanvas) {
    console.log('canvasSet');
    if (!arguments.length) {
      return state.canvasObjects[state.selectedCanvas];
    } else  {
      setState({
        selectedCanvas: newCanvas,
        perspective: 'detail'
      });
      state.canvasObjects[state.selectedCanvas].images.filter(function(image) {
        console.log(image.getImageType());
        return (image.getImageType() === 'main');
      }).forEach(function(image) {
        console.log(image);
        image.show();
      });
      dispatcher.emit('canvas-selected', { detail: newCanvas });
      return state.canvasObjects[state.selectedCanvas];
    }
  }

  function selectedPerspective(perspective) {
    if (!arguments.length) {
      return state.perspective;
    } else  {
      state.perspective = perspective;
      dispatcher.emit('perspective-updated');
      return state.perspective;
    }
  }

  function navigatePaged(currentIndex, incrementValue) {
    // Simply set which ones are "needed", let osd do the rest.
    var self = this;
    var newIndex = currentIndex + incrementValue;

    if (currentIndex % 2 !== 0) {
      newIndex = currentIndex + (2 * incrementValue);
    }

    // return if newIndex is out of range
    if (!this.isValidCanvasIndex(newIndex)) {
      return;
    }

    var getCanvasByIndex = function(index) {
      var canvasId = self.canvases[index]['@id'];
      return self.canvasObjects[canvasId];
    };

    // Do not select non-paged canvases in paged mode. Instead, find the next available
    // canvas that does not have that viewingHint.
    var newCanvas = getCanvasByIndex(newIndex);
    while(newCanvas.viewingHint === 'non-paged' && this.isValidCanvasIndex(newIndex)) {
      newIndex += incrementValue;
      newCanvas = getCanvasByIndex(newIndex);
    }

    // this.loadTileSourceForIndex(newIndex);

    // Load tilesource for the non-selected side of the pair, if it exists
    var facingPageIndex = newIndex + incrementValue;
    if(this.isValidCanvasIndex(facingPageIndex)) {
      // this.loadTileSourceForIndex(facingPageIndex);
    }

    self.electCanvasForIndex(newIndex);
  }

  function navigateIndividual(currentIndex, incrementValue) {
    var newIndex = currentIndex + incrementValue;

    // do nothing if newIndex is out of range
    if (this.isValidCanvasIndex(newIndex)) {
      // this.loadTileSourceForIndex(newIndex);
      this.selectCanvasForIndex(newIndex);
    }
  }
  // Listen for actions. This wrapper responds to asynchronous
  // processes and "actions", as distinct from "events", which
  // notify other consumers of state changes.
  return {
    getState: getState,
    setState: setState,
    selectedCanvasObject: selectedCanvasObject,
    selectedPerspective: selectedPerspective
  };
};

module.exports = viewerState;
