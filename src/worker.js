onmessage = function (event) {
  if (event.data instanceof Object) {
    const {data} = event
    if (data.cmd === 'render') {
      const {source, parameters, mainPath, options} = data
      const {isCAG, isCSG} = require('@jscad/csg')
      const {toArray} = require('./utils')

      const {loadScript, requireUncached} = require('./core/scripLoading')
      requireUncached(mainPath)
      const {scriptRootModule, params, paramDefinitions} = loadScript(source, mainPath)
      const paramValues = Object.assign({}, params, parameters)
      console.log('paramDefinitions', paramDefinitions, 'paramValues', paramValues)

      let solids = toArray(scriptRootModule.main(paramValues))
        .map(function (object) {
          if (isCSG(object) || isCAG(object)) {
            return object.toCompactBinary()
          }
        })
      self.postMessage({solids, paramValues, paramDefinitions})
    }
  }
}
