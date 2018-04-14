const most = require('most')
const {proxy} = require('most-proxy')
const {makeState} = require('./state')
const makeCsgViewer = require('@jscad/csg-viewer')
let csgViewer

// all the side effects : ie , input/outputs
const titleBar = require('./sideEffects/titleBar')()
// electron store side effect
const electronStore = require('./sideEffects/electronStore')()
// drag & drop side effect
const dragDrop = require('./sideEffects/dragDrop')()
// file watcher side effect : TODO: merge with fs
const watcher = require('./sideEffects/fileWatcher')()
// file system side effect
const fs = require('./sideEffects/fs')()
// dom side effect
const dom = require('./sideEffects/dom')()
// worker side effect
const makeWorkerEffect = require('./sideEffects/worker')
// app updates side effect
const appUpdates = require('./sideEffects/appUpdates')()
// internationalization side effect
const i18n = require('./sideEffects/i18n')()
// web workers
const solidWorker = makeWorkerEffect('src/core/code-evaluation/rebuildSolidsWorker.js')
// generic design parameter handling
const paramsCallbacktoStream = require('./utils/observable-utils/callbackToObservable')()

// proxy state stream to be able to access & manipulate it before it is actually available
const { attach, stream } = proxy()
const state$ = stream

// all the sources of data
const sources = {
  store: electronStore.source(),
  drops: dragDrop.source(document),
  watcher: watcher.source(),
  fs: fs.source(),
  paramChanges: paramsCallbacktoStream.stream,
  state$,
  dom: dom.source(),
  solidWorker: solidWorker.source(),
  appUpdates: appUpdates.source()
}
// all the actions
const designActions = require('./ui/design/actions')(sources)
const ioActions = require('./ui/io/actions')(sources)
const viewerActions = require('./ui/viewer/actions')(sources)
const otherActions = require('./ui/actions')(sources)
const actions$ = Object.assign({}, designActions, otherActions, ioActions, viewerActions)

attach(makeState(Object.values(actions$)))

// after this point, formating of data data that goes out to the sink side effects
// titlebar & store side effects
titleBar.sink(
  state$.map(state => state.appTitle).skipRepeats()
)

//
const settingsStorage = state => {
  const {themeName, design, locale} = state
  const {name, mainPath, vtreeMode, paramDefinitions, paramDefaults, paramValues} = design
  return {
    themeName,
    locale,
    design: {
      name,
      mainPath,
      vtreeMode,
      parameters: {
        paramDefinitions,
        paramDefaults,
        paramValues
      }
    },
    viewer: {
      axes: {show: state.viewer.axes.show},
      grid: {show: state.viewer.grid.show}
      // autorotate: {enabled: state.viewer.controls.autoRotate.enabled}
    },
    autoReload: state.autoReload,
    instantUpdate: state.instantUpdate
  }
}
electronStore.sink(
  state$
    .map(settingsStorage)
)
// data out to file watcher
watcher.sink(
  state$
    .filter(state => state.design.mainPath !== '')
    .skipRepeats()
    .map(state => ({filePath: state.design.mainPath, enabled: state.autoReload})) // enable/disable watch if autoreload is set to false
)
// data out to file system sink
fs.sink(
  most.mergeArray([
    state$
      .filter(state => state.design.mainPath !== '')
      .map(state => state.design.mainPath)
      .skipRepeats()
      .map(path => ({operation: 'read', id: 'loadScript', path})),
    most.just()
      .map(function () {
        const electron = require('electron').remote
        const userDataPath = electron.app.getPath('userData')
        const path = require('path')

        const cachePath = path.join(userDataPath, '/cache.js')
        return {operation: 'read', id: 'loadCachedGeometry', path: cachePath}
      })
  ])
)

i18n.sink(
  state$
    .map(state => state.locale)
    .skipRepeats()
    .map(data => ({operation: 'changeSettings', data}))
)

// web worker sink
const solidWorkerBase$ = most.mergeArray([
  actions$.setDesignContent$.map(action => ({paramValues: undefined, origin: 'designContent', error: undefined})),
  actions$.updateDesignFromParams$.map(action => action.data)
]).multicast()

solidWorker.sink(
    most.sample(function ({origin, paramValues, error}, {design, instantUpdate}) {
      if (error) {
        return undefined
      }
      console.log('design stuff', design)
      const applyParameterDefinitions = require('@jscad/core/parameters/applyParameterDefinitions')
      paramValues = paramValues || design.paramValues // this ensures the last, manually modified params have upper hand
      paramValues = paramValues ? applyParameterDefinitions(paramValues, design.paramDefinitions) : paramValues
      if (!instantUpdate && origin === 'instantUpdate') {
        return undefined
      }
      // console.log('sending paramValues', paramValues, 'options', vtreeMode)
      const options = {vtreeMode: design.vtreeMode, lookup: design.lookup, lookupCounts: design.lookupCounts}
      return {source: design.source, mainPath: design.mainPath, paramValues, options}
    },
    solidWorkerBase$,
    solidWorkerBase$,
    state$
      .filter(state => state.design.mainPath !== '')
      .skipRepeats()
  )
    .filter(x => x !== undefined)
    .map(({source, mainPath, paramValues, options}) => ({cmd: 'render', source, mainPath, parameters: paramValues, options}))
)

// viewer data
state$
  .filter(state => state.design.mainPath !== '')
  .skipRepeatsWith(function (state, previousState) {
    // const sameParamDefinitions = JSON.stringify(state.design.paramDefinitions) === JSON.stringify(previousState.design.paramDefinitions)
    // const sameParamValues = JSON.stringify(state.design.paramValues) === JSON.stringify(previousState.design.paramValues)
    const sameSolids = state.design.solids.length === previousState.design.solids.length &&
    JSON.stringify(state.design.solids) === JSON.stringify(previousState.design.solids)
    return sameSolids
  })
  .forEach(state => {
    if (csgViewer !== undefined) {
      csgViewer(undefined, {solids: state.design.solids})
    }
  })

// ui updates, exports
// FIXME: this is horrible, restructure
const outToDom$ = state$
  .skipRepeatsWith(function (state, previousState) {
    const sameParamDefinitions = JSON.stringify(state.design.paramDefinitions) === JSON.stringify(previousState.design.paramDefinitions)
    const sameParamValues = JSON.stringify(state.design.paramValues) === JSON.stringify(previousState.design.paramValues)

    const sameInstantUpdate = state.instantUpdate === previousState.instantUpdate

    const sameExportFormats = state.exportFormat === previousState.exportFormat &&
      state.availableExportFormats === previousState.availableExportFormats

    const sameStyling = state.themeName === previousState.themeName

    const sameAutoreload = state.autoReload === previousState.autoReload

    const sameError = JSON.stringify(state.error) === JSON.stringify(previousState.error)
    const sameStatus = state.busy === previousState.busy

    const sameShowOptions = state.showOptions === previousState.showOptions
    const samevtreeMode = state.vtreeMode === previousState.vtreeMode

    const sameAppUpdates = JSON.stringify(state.appUpdates) === JSON.stringify(previousState.appUpdates)

    // const sameLocale = state.locale === previousState.locale

    return sameParamDefinitions && sameParamValues && sameExportFormats && sameStatus && sameStyling &&
      sameAutoreload && sameInstantUpdate && sameError && sameShowOptions && samevtreeMode && sameAppUpdates
  })
  .combine(function (state, i18n) {
    return require('./ui/views/main')(state, paramsCallbacktoStream, i18n)
  }, i18n.source())

dom.sink(outToDom$)

// for viewer

/* viewerActions
  .toggleGrid$
  .forEach(params => {
    console.log('changing viewer params', params)
    const viewerElement = document.getElementById('renderTarget')
    setCanvasSize(viewerElement)
    // initialize viewer if it has not been done already
    if (viewerElement && !csgViewer) {
      const csgViewerItems = makeCsgViewer(viewerElement, params)
      csgViewer = csgViewerItems.csgViewer
    }
    if (csgViewer) {
      csgViewer(params)
    }
  }) */
state$
  .map(state => state.viewer)
  .skipRepeatsWith(function (state, previousState) {
    const sameViewerParams = JSON.stringify(state) === JSON.stringify(previousState)
    return sameViewerParams
  })
  .forEach(params => {
    const viewerElement = document.getElementById('renderTarget')
    // initialize viewer if it has not been done already
    if (viewerElement && !csgViewer) {
      const csgViewerItems = makeCsgViewer(viewerElement, params)
      csgViewer = csgViewerItems.csgViewer
    }
    if (csgViewer) {
      csgViewer(params)
    }
  })
