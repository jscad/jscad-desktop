//
const makeBuildCachedGeometryFromTree = require('jscad-tree-experiment').buildCachedGeometry
console.log('calling this one here')
const buildCachedGeometryFromTree = makeBuildCachedGeometryFromTree({passesBeforeElimination: 20})

const defaults = {vTreeMode: true}

onmessage = function (event) {
  if (event.data instanceof Object) {
    console.log('in web worker')
    const {data} = event
    if (data.cmd === 'render') {
      const {source, parameters, mainPath, options} = data
      const {vTreeMode} = Object.assign({}, defaults, options)
      const apiMainPath = vTreeMode ? './vtreeApi' : '@jscad/csg/api'

      const {isCAG, isCSG} = require('@jscad/csg')
      const {toArray} = require('../../utils/utils')

      const {loadScript} = require('../code-loading/scriptLoading')
      const requireUncached = require('../code-loading/requireUncached')
      // TODO: only uncache when needed
      requireUncached(mainPath)
      const {scriptRootModule, params, paramDefinitions} = loadScript(source, mainPath, apiMainPath)
      const paramDefaults = params
      const paramValues = Object.assign({}, paramDefaults, parameters)
      // console.log('paramDefinitions', paramDefinitions, 'paramValues', paramValues)
      self.postMessage({'type': 'params', paramDefaults, paramValues, paramDefinitions})

      /* let solids = toArray(scriptRootModule.main(paramValues))
        .map(function (object) {
          if (isCSG(object) || isCAG(object)) {
            return object.toCompactBinary()
          }
        }) */
      let solids
      let rawResults = toArray(scriptRootModule.main(paramValues))
      const isSolidResult = (rawResults.length > 0 && (isCSG(rawResults[0]) || isCAG(rawResults[0])))
      if (isSolidResult) {
        solids = rawResults
      } else {
        solids = buildCachedGeometryFromTree({}, rawResults)
      }
      solids = solids
        .map(object => {
          if (isCSG(object) || isCAG(object)) {
            return object.toCompactBinary()
          }
        })
      self.postMessage({'type': 'solids', solids})
    }
  }
}
