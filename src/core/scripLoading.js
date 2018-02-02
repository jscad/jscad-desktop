const fs = require('fs')
const path = require('path')
const getParameterDefinitionsCLI = require('./getParameterDefinitionsCLI')
const stripBom = require('strip-bom')

require.extensions['.jscad'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8')
  module._compile(stripBom(content), filename)
}

/** load an npm module from a string
 * @param  {String} src the source code of the module
 * @param  {String} filename the filename of the module
 */
function requireFromString (src, filename) {
  // completely ripped out of https://github.com/floatdrop/require-from-string
  // shamefully
  const Module = require('module')
  const paths = Module._nodeModulePaths(path.dirname(filename))
  const otherPaths = [path.resolve(__dirname, '../../node_modules/')]
  const parent = module.parent
  const m = new Module(filename, parent)
  m.filename = filename
  m.paths = [].concat(otherPaths).concat(paths)
  m._compile(src, filename)

  const exports = m.exports
  parent.children && parent.children.splice(parent.children.indexOf(m), 1)

  return exports
  /* var Module = module.constructor
  var m = new Module()
  m._compile(src, filename)
  return m.exports */
}

// from https://stackoverflow.com/questions/9210542/node-js-require-cache-possible-to-invalidate/16060619#16060619
function requireUncached (moduleName) {
  /* console.log(`removing ${moduleName} from cache`)
  delete require.cache[require.resolve(moduleName)]

  Object.keys(module.constructor._pathCache).forEach(function (cacheKey) {
    if (cacheKey.indexOf(moduleName) > 0) {
      delete module.constructor._pathCache[cacheKey]
    }
  })
  return require(moduleName) */
  var decache = require('decache')
  decache(moduleName)
}

const doesModuleExportParameterDefiniitions = moduleToCheck => {
  return moduleToCheck && 'getParameterDefinitions' in moduleToCheck
}

/** load a jscad script, injecting the basic dependencies if necessary
 * @param  {} filePath
 * @param  {} csgBasePath='../../../../core/tmp/csg.js : relative path or  '@jscad/csg'
 */
function loadScript (scriptAsText, filePath, csgBasePath = '@jscad/csg/api') {
  if (csgBasePath.includes('.')) {
    csgBasePath = path.resolve(__dirname, csgBasePath)
  }
  console.log('loading script using jscad/csg base path at:', csgBasePath)
  let scriptRootModule
  // && !scriptAsText.includes('require(')
  if ((!scriptAsText.includes('module.exports')) && scriptAsText.includes('main')) {
    const getParamsString = scriptAsText.includes('getParameterDefinitions')
      ? 'module.exports.getParameterDefinitions = getParameterDefinitions' : ''
    const commonJsScriptText = `
    const {CSG, CAG} = require('${csgBasePath}').csg
    const {square, circle, polygon} = require('${csgBasePath}').primitives2d
    const {cube, cylinder, sphere, polyhedron, torus} = require('${csgBasePath}').primitives3d
    const {color} = require('${csgBasePath}').color
    const {rectangular_extrude, linear_extrude, rotate_extrude} = require('${csgBasePath}').extrusions
    const {rotate, translate, scale, hull, chain_hull, expand, contract} = require('${csgBasePath}').transformations
    const {union, difference, intersection} = require('${csgBasePath}').booleanOps
    const {sin, cos, tan, sqrt, lookup} = require('${csgBasePath}').maths
    const {hsl2rgb} = require('${csgBasePath}').color
    const {vector_text, vector_char} = require('${csgBasePath}').text
    const {OpenJsCad} = require('${csgBasePath}').OpenJsCad
    const {echo} = require('${csgBasePath}').debug
    
    ${scriptAsText}
    module.exports.main = main
    ${getParamsString}
    `
    scriptRootModule = requireFromString(commonJsScriptText, filePath)
  } else {
    scriptRootModule = require(filePath)
  }
  if ((typeof (scriptRootModule) === 'function')) { // single export ???
    console.warn('please use named exports for your main() function !')
    scriptRootModule = {main: scriptRootModule}
  }
  let params = {}
  let paramDefinitions = []
  if (doesModuleExportParameterDefiniitions(scriptRootModule)) {
    paramDefinitions = scriptRootModule.getParameterDefinitions() || []
    params = getParameterDefinitionsCLI(scriptRootModule.getParameterDefinitions)
  }
  return {params, paramDefinitions, scriptRootModule: scriptRootModule}
}

module.exports = {loadScript, requireUncached, requireFromString}
