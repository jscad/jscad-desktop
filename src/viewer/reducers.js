const toggleAutorotate = (state, autoRotate) => {
  const controls = Object.assign({}, state.viewer.controls, {autoRotate: {enabled: autoRotate}})
  const viewer = Object.assign({}, state.viewer, {controls})
  return Object.assign({}, state, {viewer})
}
const toggleGrid = (state, show) => {
  const grid = Object.assign({}, state.viewer.grid, {show})
  const viewer = Object.assign({}, state.viewer, {grid})
  return Object.assign({}, state, {viewer})
}
const toggleAxes = (state, show) => {
  const axes = Object.assign({}, state.viewer.axes, {show})
  const viewer = Object.assign({}, state.viewer, {axes})
  return Object.assign({}, state, {viewer})
}
const toPresetView = (state, viewName) => {
  const viewer = Object.assign({}, state.viewer, {camera: {position: viewName}})
  return Object.assign({}, state, {viewer})
}
const setProjectionType = (state, projectionType) => {
  const viewer = Object.assign({}, state.viewer, {camera: {projectionType}})
  return Object.assign({}, state, {viewer})
}

module.exports = {
  toggleAutorotate,
  toggleGrid,
  toggleAxes,
  toPresetView,
  setProjectionType
}