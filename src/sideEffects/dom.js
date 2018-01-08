const most = require('most')

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
    .take(1).forEach(function (state) {
      tree = dom(state)
      document.getElementById('container').appendChild(tree)
    })
  return most.mergeArray([
    tree
  ])
}

function makeDomSource () {

}

module.exports = {makeDomSource, domSink}
