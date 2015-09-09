var domComponent = function(container) {

  var overlaysContainer = document.createElement('div'),
      osdElement = document.createElement('div'),
      scrollArea = document.createElement('div');

  overlaysContainer.className = 'overlaysContainer';
  osdElement.className = 'osdContainer';
  scrollArea.className = 'scrollArea';

  overlaysContainer.style.cssText = 'position:absolute;width:100%;height:100%;top:0;left:0;';
  osdElement.style.cssText = 'position:absolute;width:100%;height:100%;top:0;left:0;';
  scrollArea.style.cssText = 'position:absolute;width:100%;height:100%;top:0;left:0;overflow:hidden';

  container.appendChild(osdElement);
  container.appendChild(scrollArea);
  scrollArea.appendChild(overlaysContainer);

  return {
    overlaysContainer: overlaysContainer,
    osdElement: osdElement,
    scrollArea: scrollArea
  };
};

module.exports = domComponent;
