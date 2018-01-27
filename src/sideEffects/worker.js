const most = require('most')
const callBackToStream = require('../observable-utils/callbackToObservable')

const makeWorkerEffect = (worker) => {
  let _worker = worker

  const workerSink = function (outToWorker$) {
    outToWorker$.forEach(message => {
      _worker.postMessage(message)
    })
  }

  const workerEventsCb = callBackToStream()
  _worker.onerror = error => workerEventsCb.callback({error})
  _worker.onmessage = message => workerEventsCb.callback(message)

  const workerSource = function () {
    return workerEventsCb.stream.multicast()
  }
  return {
    sink: workerSink,
    source: workerSource
  }
}

module.exports = makeWorkerEffect
