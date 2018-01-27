onmessage = function (event) {
  console.log(event)
  if (event.data instanceof Object) {
    const {data} = event
    if (data.cmd === 'render') {
      const {source, parameters, options} = data
      const {isCAG, isCSG} = require('@jscad/csg')
      const {toArray} = require('./utils')

      const {loadScript} = require('./core/scripLoading')
      const {scriptRootModule, params} = loadScript(source, options.mainPath)
      // console.log('paramDefinitions', paramDefinitions, 'params', params)
      let solids = toArray(scriptRootModule.main(params))
        .map(function (object) {
          if (isCSG(object) || isCAG(object)) {
            return object.toCompactBinary()
          }
        })
      console.log('here', params, scriptRootModule)
      self.postMessage({solids})
    }
  }
}
