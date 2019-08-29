
function initStats (type) {
  var panelType = (typeof type !== 'undefined' && type) && (!isNaN(type)) ? parseInt(type) : 0;
  var stats = new Stats();

  stats.showPanel(panelType)
  document.body.appendChild(stats.dom)
  return stats
}
