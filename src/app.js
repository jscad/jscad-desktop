const {proxy} = require('most-proxy')
const {makeState, initialState} = require('./state')
const makeCsgViewer = require('../../csg-viewer/src/index')

let csgViewer

// all the side effects : ie , input/outputs
const {electronStoreSink, electronStoreSource} = require('./sideEffects/electronStore')
const {titleBarSink} = require('./sideEffects/titleBar')
const makeDragDropSource = require('./sideEffects/dragDrop')
const storeSource$ = electronStoreSource()
const dragAndDropSource$ = makeDragDropSource(document)
const {watcherSink, watcherSource} = require('./sideEffects/fileWatcher')
const {fsSink, fsSource} = require('./sideEffects/fsWrapper')
const {domSink, domSource} = require('./sideEffects/dom')
const paramsCallbacktoStream = require('./observable-utils/callbackToObservable')()

// proxy state stream to be able to access & manipulate it before it is actually available
const { attach, stream } = proxy()
const state$ = stream
//
const actions$ = require('./actions')({
  store: storeSource$,
  drops: dragAndDropSource$,
  watcher: watcherSource(),
  fs: fsSource(),
  paramChanges: paramsCallbacktoStream.stream,
  state$
})

attach(makeState(Object.values(actions$)))
state$.forEach(function (state) {
  // console.log('state', state)
})

// titlebar & store side effects
titleBarSink(
  state$.map(state => state.appTitle).skipRepeats()
)
electronStoreSink(state$
  .map(function (state) {
    const {themeName, design} = state
    const {name, mainPath} = design
    return {
      themeName,
      design: {
        name,
        mainPath
      },
      viewer: {
        axes: {show: state.viewer.axes.show},
        grid: {show: state.viewer.grid.show}
      },
      autoReload: state.autoReload
    }
  })
)
// data out to file watcher
watcherSink(
  state$
    .filter(state => state.design.mainPath !== '' && state.autoReload === true) // FIXME: disable watch if autoreload is set to false
    .map(state => state.design.mainPath)
    .skipRepeats()
)
/* fsSink(
  state$
    .filter(state => state.design.mainPath !== '')
    .map(state => ({operation: 'read', id: 'loadScript', path: state.design.mainPath}))
    .skipRepeats()
) */

// bla
state$
  .filter(state => state.design.mainPath !== '')
  /* .skipRepeatsWith((a, b) => {
    // console.log('FOObar', a, b)
    return a.design.mainPath === b.design.mainPath //&& b.design.solids
  }) */
  .forEach(state => {
    console.log('changing solids')
    if (csgViewer !== undefined) {
      csgViewer(undefined, {solids: state.design.solids})
    }
  })

// ui updates, exports
const morph = require('morphdom')// require('nanomorph')
const html = require('bel')
let tree

function dom (state) {
  const formatsList = state.availableExportFormats
    .map(function ({name, displayName}) {
      return html`<option value=${name}>${displayName}</option>`
    })

  console.log('state', state)
  const {createParamControls} = require('./ui/paramControls2')
  const {paramValues, paramDefinitions} = state.design
  const {controls} = createParamControls(paramValues, paramDefinitions, state.instantUpdate, paramsCallbacktoStream.callback)

  const output = html`
    <div id='container'>
      <!--Ui Controls-->
      <div id='controls'>
        <input type="button" value="load jscad (.js or .jscad) file" id="fileLoader"/>
        <label for="autoReload">Auto reload</label>
          <input type="checkbox" id="autoReload"/>
        <label for="grid">Grid</label>
          <input type="checkbox" id="grid"/>
        <label for="autoRotate">Autorotate</label>
          <input type="checkbox" id="autoRotate"/>
        
        <select id='themeSwitcher'>
          <option value='dark'>Dark Theme</option>
          <option value='light'>Light Theme</option>
        </select>
        
        <span id='exports'>
          <select id='exportFormats'>
          ${formatsList}
          </select>
          <input type='button' value="export to ${state.exportFormat}" id="exportBtn"/>
        </span>

        <span id='busy'>${state.busy ? 'processing, please wait' : ''}</span>
      </div>
      <!--Params-->
      <span id='params'>
        <span id='paramsMain'>
          <table>
            ${controls}
          </table>
        </span>
        <span id='paramsControls'>
          <button id='updateDesignFromParams'>Update</button>
          <label for='instantUpdate'>Instant Update</label>
          <input type='checkbox' checked='${state.instantUpdate}' id='instantUpdate'/>
        </span>
      </span>

      <canvas id='renderTarget'> </canvas>
      
    </div>
  `
  return output
  // width=1000 height= 1000
}
state$.take(1).forEach(function (state) {
  tree = dom(state)
  document.body.appendChild(tree)
})
state$
  .skip(1)
  .skipRepeatsWith(function (state, previousState) {
    const sameParamDefinitions = JSON.stringify(state.design.paramDefinitions) === JSON.stringify(previousState.design.paramDefinitions)
    const sameExportFormats = state.exportFormat === previousState.exportFormat &&
     state.availableExportFormats === previousState.availableExportFormats
    const sameStatus = state.busy === previousState.busy
    return sameParamDefinitions && sameExportFormats && sameStatus
  })
  .forEach(function (state) {
    morph(tree, dom(state))
  })

// for viewer
state$
  .map(state => state.viewer)
  .skipRepeatsWith(function (a, b) {
    return JSON.parse(JSON.stringify(a)) === JSON.parse(JSON.stringify(b))
  })
  /* require('most').mergeArray(
  [
    actions$.toggleGrid$.map(x => ({grid: {show: x.data}})),
    // actions$.toggleAutorotate$,
    // actions$.changeTheme$.map(x=>x)
  ]
  ) */
  .forEach(params => {
    const viewerElement = document.getElementById('renderTarget')
    setCanvasSize(viewerElement)
    if (viewerElement && !csgViewer) {
      const csgViewerItems = makeCsgViewer(viewerElement, params)
      csgViewer = csgViewerItems.csgViewer
    }
    if (csgViewer) {
      csgViewer(params)
    }
  })

function setCanvasSize (viewerElement) {
  let pixelRatio = window.pixelRatio || 1
  pixelRatio = 2 // upscaling
  let w = window.innerWidth
  let h = window.innerHeight
  if (viewerElement !== document.body) {
    const bounds = viewerElement.getBoundingClientRect()
    w = bounds.right - bounds.left
    h = bounds.bottom - bounds.top
    console.log('foo', w, h)
  }
  w = pixelRatio * w
  h = pixelRatio * h
  viewerElement.width = w
  viewerElement.height = h
  viewerElement.clientWidth = w
  viewerElement.clientHeight = h
  //viewerElement.style.width = w + 'px'
  //viewerElement.style.height = h + 'px'
}
window.onresize = function(){
  setCanvasSize(document.getElementById('renderTarget'))
}
