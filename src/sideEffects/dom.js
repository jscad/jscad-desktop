const most = require('most')
const morph = require('morphdom')// require('nanomorph')
const {proxy} = require('most-proxy')
const { attach, stream } = proxy()

const out$ = stream
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

  const foo$ = most.mergeArray([
    firstRender$,
    otherRenders$
  ]).multicast()

  attach(foo$)
  foo$.forEach(x => x)
}

/* let storedObservables = {}
let waitingForListeners = []
let eventsForListners = {} */
let storedListeners = {

}
function domSource () {
  function getElements (query) {
    return Array.from(document.querySelectorAll(query))
  }

  const select = function (query) {
    // console.log('selecting', query)
    const items = getElements(query)

    let outputStream
    if (!items || (items && items.length === 0)) {
      const eventProxy = proxy()
      outputStream = eventProxy.stream
      storedListeners[query] = {observable: eventProxy, live: false}
    }

    return {events: function events (eventName) {
      // eventsForListners[query] = eventName
      storedListeners[query].events = eventName
      return outputStream
    }}
  }

  out$.forEach(function () {
    // console.log('dom source watching dom change')
    Object.keys(storedListeners).forEach(function (query) {
      const items = getElements(query)
      // console.log('fooo', items)
      if (items && items.length > 0) {
        const storedListener = storedListeners[query]
        if (storedListener.live === false) {
          storedListener.live = true

          const itemObs = items.map(item => {
            // console.log('HURRAY NOW I HAVE SOMETHING !!')
            return most.fromEvent(storedListener.events, item)   
          })
          const realObservable = most.mergeArray(itemObs)
          storedListener.observable.attach(realObservable)
        }
      }
    })
  })

  return {select}
}

module.exports = function makeDomSource () {
  return {source: domSource, sink: domSink}
}
