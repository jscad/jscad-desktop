const most = require('most')
const morph = require('morphdom')// require('nanomorph')

function domSource () {
  let storedListeners = []
  const select = function (query) {
    let item
    if ('.' in query) {
      item = document.getElementsByClassName(query)
    }
    if ('#' in query) {
      item = document.getElementById(query)
    }

    if (item === undefined) {

    }
  }
  return select
}

function domSink (outToDom$) {
  let tree
  const firstRender$ = outToDom$
    .take(1)
    .map(function (_tree) {
      tree = _tree
      document.body.appendChild(tree)
    })
  const otherRenders$ = outToDom$
    .skip(1)
    .map(function (newTree) {
      morph(tree, newTree)
    })

  return most.mergeArray([
    firstRender$,
    otherRenders$
  ]).forEach(x => x)
}

function makeDomSource () {

}

module.exports = {makeDomSource, domSink}
