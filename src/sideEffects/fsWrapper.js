
const fs = require('fs')
const callBackToStream = require('../utils/observable-utils/callbackToObservable')

const readFileToCB = callBackToStream()

function fsSink (out$) {
  out$.forEach(function ({path, operation, id}) {
    console.log('read/writing to', path, operation)
    if (operation === 'read') {
      fs.readFile(path, 'utf8', function (error, data) {
        if (error) {
          readFileToCB.callback({path, operation, error, id})
        } else {
          readFileToCB.callback({path, operation, data, id})
        }
      })
    }
  })
}

function fsSource () {
  return readFileToCB.stream.multicast()
}

module.exports = {
  fsSink,
  fsSource
}
