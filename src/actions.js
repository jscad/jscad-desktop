const path = require('path')
const most = require('most')
const {remote} = require('electron')
const {dialog} = remote
const {getScriptFile} = require('./core/scripLoading')

const makeActions = (sources) => {
  sources.watcher.forEach(function (data) {
    console.log('watchedFile', data)
  })
  sources.drops.forEach(function (data) {
    console.log('drop', data)
  })
  sources.fs.forEach(function (data) {
    console.log('fs operations', data)
  })
  sources.paramChanges.forEach(function (data) {
    console.log('param changes', data)
  })

  const toggleGrid$ = most.mergeArray([
    sources.dom.select('#grid').events('click')
      .map(e => e.target.checked),
    sources.store.map(data => data.viewer.grid.show)
  ])
    .map(data => ({type: 'toggleGrid', data}))

  const toggleAxes$ = most.mergeArray([
    sources.dom.select('#toggleAxes').events('click')
      .map(e => e.target.checked)
    //sources.store.map(data => data.viewer.grid.show)
  ])
    .map(data => ({type: 'toggleAxes', data}))

  const toggleAutorotate$ = most.mergeArray([
    sources.dom.select('#autoRotate').events('click')
    .map(e => e.target.checked)
      // sources.store.map(data => data.viewer.grid.show)
  ])
    .map(data => ({type: 'toggleAutorotate', data}))

  const changeTheme$ = most.mergeArray([
    sources.dom.select('#themeSwitcher').events('change')
      .map(e => e.target.value),
    sources.store.map(data => data.themeName)
  ])
  .map(data => ({type: 'changeTheme', data}))

  // non visual related actions
  const toggleAutoReload$ = most.mergeArray([
    sources.dom.select('#autoReload').events('click')
      .map(e => e.target.checked),
    sources.store
      .map(data => data.autoReload)
  ])
  .map(data => ({type: 'toggleAutoReload', data}))

  const toggleInstantUpdate$ = most.mergeArray([
    sources.dom.select('#instantUpdate').events('click').map(event => event.target.checked),
    sources.store.map(data => data.instantUpdate)
  ])
    .map(data => ({type: 'toggleInstantUpdate', data}))

  const changeExportFormat$ = sources.dom.select('#exportFormats').events('change')
    .map(e => e.target.value)
    .map(data => ({type: 'changeExportFormat', data}))

  const exportRequested$ = sources.dom.select('#exportBtn').events('click')
    .sample(function (state, event) {
      console.log('state stuff', state, event)
      const defaultExportFilePath = state.exportFilePath
      return {defaultExportFilePath, exportFormat: state.exportFormat, data: state.design.solids}
    }, sources.state$)
    .map(function ({defaultExportFilePath, exportFormat, data}) {
      console.log('exporting data to', defaultExportFilePath)
      const filePath = dialog.showSaveDialog({properties: ['saveFile'], title: 'export design to', defaultPath: defaultExportFilePath})//, function (filePath) {
      console.log('saving', filePath)
      if (filePath !== undefined) {
        const saveDataToFs = require('./io/saveDataToFs')
        saveDataToFs(data, exportFormat, filePath)
      }
    })
    .map(data => ({type: 'exportRequested', data}))

  const designPath$ = most.mergeArray([
    sources.dom.select('#fileLoader').events('click')
      .map(function () {
        const paths = dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']})
        return paths
      }),
    sources.store
      .map(data => data.design.mainPath)
      .filter(data => data !== '')
      .map(data => [data]),
    sources.drops
      .filter(drop => drop.type === 'fileOrFolder' && drop.data.length > 0)
      .map(drop => drop.data.map(fileOrFolder => fileOrFolder.path)),
    sources.watcher
      .map(path => [path])
  ])
    .filter(data => data !== undefined)
    .multicast()

  const designLoadRequested$ = designPath$
    .map(data => ({type: 'designLoadRequested', data}))

  const setDesignPath$ = designPath$
    .map(data => ({type: 'setDesignPath', data}))
    .delay(1)

  const setDesignScriptContent$ = most.mergeArray([
    sources.fs.filter()
  ])
    .map(data => ({type: 'setDesignScriptContent', data}))

  // design parameter change actions
  const updateDesignFromParams$ = most.mergeArray([
    sources.dom.select('#updateDesignFromParams').events('click')
      .map(function () {
        const controls = Array.from(document.getElementById('paramsMain').getElementsByTagName('input'))
        return {paramValues: require('./core/getParamValues')(controls), origin: 'manualUpdate'}
      }),
    sources.paramChanges.map(function (controls) {
      return {paramValues: require('./core/getParamValues')(controls), origin: 'instantUpdate'}
    })
  ])
    .map(data => ({type: 'updateDesignFromParams', data}))

  return {
    toggleGrid$,
    toggleAxes$,
    toggleAutorotate$,
    toggleAutoReload$,
    toggleInstantUpdate$,
    changeExportFormat$,
    exportRequested$,
    changeTheme$,
    setDesignPath$,
    designLoadRequested$,
    updateDesignFromParams$
  }
}

module.exports = makeActions
