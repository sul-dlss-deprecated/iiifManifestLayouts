var CanvasObject = require('./canvasObject');

var viewerState = function(config) {
  var dispatcher = config.dispatcher,
      configCanvases = config.sequence ? config.sequence.canvases : config.manifest.sequences[0].canvases,
      state = {
        canvases : configCanvases,
        canvasObjects : buildCanvasObjects(configCanvases),
        selectedCanvas : config.selectedCanvas || configCanvases[0]['@id'], // @id of the canvas:
        perspective : config.perspective ? config.perspective : 'overview',
        viewingMode : config.viewingMode ? config.viewingHint : getViewingHint(config.sequence, config.manifest), // manifest derived or user specified (iiif viewingHint)
        viewingDirection : config.viewingDirection ? config.viewingDirection : getViewingDirection(config.sequence, config.manifest), // manifest derived or user specified (iiif viewingHint)
        width : config.width,
        height : config.height,
        scaleFactor: config.scaleFactor || 0.5,
        framePadding : config.framePadding || {top: 10, bottom: 40, right: 10, left: 10},
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

    if (!arguments.length) {
      return state.canvasObjects[state.selectedCanvas];
    } else  {
      var canvas,
          adjacentCanvases,
          sourcePerspective = state.perspective;
      if (sourcePerspective === 'detail') {
        setState({
          selectedCanvas: newCanvas
        });

        // Mark all canvases as "needed" that may be in a view with this canvas
        // This is accomplished by means of the "show" method on its image resources.
        canvas = state.canvasObjects[state.selectedCanvas];
        adjacentCanvases = getNeededCanvases(canvas);
        canvas.show();
        adjacentCanvases.forEach(function(canvas){
          canvas.show();
        });

        dispatcher.emit('selectedCanvasUpdated', {from: sourcePerspective});
        return state.canvasObjects[state.selectedCanvas];
      }

      setState({
        selectedCanvas: newCanvas,
        perspective: 'detail'
      });

      // Mark all canvases as "needed" that may be in a view with this canvas
      // This is accomplished by means of the "show" method on its image resources.
      canvas = state.canvasObjects[state.selectedCanvas];
      adjacentCanvases = state.canvasObjects.indexOf(canvas);
      canvas.show();

      dispatcher.emit('selectedCanvasUpdated', {from: sourcePerspective});
      return state.canvasObjects[state.selectedCanvas];
    }
  }

  function getNeededCanvases(canvas) {
    var self = this;
    console.log(this);
    var canvasIndex = state.canvasObjects.indexOf(canvas);
    var neededIndices = [canvasIndex - 1, canvasIndex + 1, canvasIndex + 2];
    return neededIndices.map(function(index){
      return state.canvasObjects[index];
    });
  }

  function canvases(canvases) {
    if (!arguments.length) {
      return state.canvases;
    } else  {
      state.canvases = state.canvases;
      state.selectedCanvas = canvases.some(function(canvas){
        return;
      }) ? state.selectedCanvas : canvases[0]['@id'];
      dispatcher.emit('canvasesUpdated');
      return state.canvases;
    }
  }

  function selectedPerspective(perspective) {
    if (!arguments.length) {
      return state.perspective;
    } else  {
      state.perspective = perspective;
      if (perspective === 'detail') {
        var canvas = state.canvasObjects[state.selectedCanvas];
        canvas.images.filter(function(image) {
          return (image.getImageType() === 'main');
        }).forEach(function(image) {
          image.show();
        });

        canvas.thumbnailResource.remove();
      }
      dispatcher.emit('perspectiveUpdated');
      return state.perspective;
    }
  }

  function scaleFactor(scaleFactor){
    if (!arguments.length) {
      return state.scaleFactor;
    } else  {
      state.scaleFactor = scaleFactor;
      dispatcher.emit('scaleFactorUpdated');
      return state.scaleFactor;
    }
  }

  function size(width, height) {
    if (!arguments.length) {
      return {
        width: state.width,
        height: state.height
      };
    } else  {
      state.width = width;
      state.height = height;
      dispatcher.emit('sizeUpdated');
      return {
        width: state.width,
        height: state.height
      };
    }
  }

  function isValidCanvasIndex(index) {
    console.log(index);
    return(index >= 0 && index <= state.canvases.length);
  }

  // Listen for actions. This wrapper responds to asynchronous
  // processes and "actions", as distinct from "events", which
  // notify other consumers of state changes.
  return {
    getState: getState,
    setState: setState,
    selectedCanvasObject: selectedCanvasObject,
    selectedPerspective: selectedPerspective,
    isValidCanvasIndex: isValidCanvasIndex,
    canvases: canvases,
    size: size
  };
};

module.exports = viewerState;
