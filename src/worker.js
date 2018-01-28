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
      console.log('paramDefinitions', paramDefinitions)
      const paramValues = Object.assign({}, params, parameters)
      let solids = toArray(scriptRootModule.main(paramValues))
        .map(function (object) {
          if (isCSG(object) || isCAG(object)) {
            return object.toCompactBinary()
          }
        })
      self.postMessage({solids, params, paramDefinitions})
    }
  }
}
