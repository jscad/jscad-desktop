const most = require('most')
const {head} = require('../utils/utils')

function compositeKeyFromKeyEvent (event) {
  const ctrl = event.ctrlKey ? 'ctrl+' : ''
  const shift = event.shiftKey ? 'shift+' : ''
  const meta = event.metaKey ? 'command+' : ''
  let key = event.key.toLowerCase()
  if (ctrl && key === 'control') {
    key = ''
  }
  if (shift && key === 'shift') {
    key = ''
  }
  if (meta && key === 'meta') {
    key = ''
  }
  const compositeKey = `${ctrl}${shift}${meta}${key}`
  return compositeKey
}

const makeActions = (sources) => {
  /* sources.watcher.forEach(function (data) {
    console.log('watchedFile', data)
  })
  sources.drops.forEach(function (data) {
    console.log('drop', data)
  })
  sources.fs.forEach(function (data) {
    console.log('fs operations', data)
  })
  sources.paramChanges.forEach(function (data) {
    console.log('param changes', data)
  }) */

  // keyboard shortcut handling
  const keyDowns$ = most.fromEvent('keyup', document)
  const actionsFromKey$ = most.sample(function (event, state) {
    const compositeKey = compositeKeyFromKeyEvent(event)
    const matchingAction = head(state.shortcuts.filter(shortcut => shortcut.key === compositeKey))
    if (matchingAction) {
      const {command, args} = matchingAction
      return {type: command, data: args}
    }
    return undefined
  }, keyDowns$, keyDowns$, sources.state$)
    .filter(x => x !== undefined)

  // set shortcuts
  const setShortcuts$ = most.mergeArray([
    sources.store
      .filter(data => data && data.shortcuts)
      .map(data => data.shortcuts)
  ])
  .map(data => ({type: 'setShortcuts', data}))

  // set a specific shortcut
  const shortcutCommandKey$ = sources.dom.select('.shortcutCommand').events('keyup').multicast()
  shortcutCommandKey$
    .forEach(event => {
      event.preventDefault()
      event.stopPropagation()
      return false
    })
  const setShortcut$ = most.mergeArray([
    shortcutCommandKey$
    .map(event => {
      const compositeKey = compositeKeyFromKeyEvent(event)
      return {
        key: compositeKey,
        command: event.target.dataset.command,
        args: event.target.dataset.args
      }
    })
    .loop((values, x) => {
      console.log('looping', values, x)
      if (!Array.isArray(values)) {
        values = []
      }
      values.push(x)
      if (x.key === 'enter') {
        values = values.slice(0, -1)
          .reduce((acc, cur) => {
            return Object.assign({}, acc, {key: `${acc.key}+${cur.key}`})
          })
        return {seed: values, value: values}
      }
      return {seed: values}
    }, [])
    .filter(x => x !== undefined)

  ])
  .map(data => ({type: 'setShortcut', data}))
  .multicast()

  // sources.dom.select('.shortcutCommand').events('keydown')
  //
  // setShortcut$.forEach(event => event.preventDefault)
  setShortcut$.forEach(x => console.log('shortcutCommand', x))

  const changeTheme$ = most.mergeArray([
    sources.dom.select('#themeSwitcher').events('change')
      .map(e => e.target.value),
    sources.store
      .filter(data => data && data.themeName)
      .map(data => data.themeName)
  ])
  .startWith('light')
  .map(data => ({type: 'changeTheme', data}))

  const changeLanguage$ = most.mergeArray([
    sources.dom.select('#languageSwitcher').events('change')
      .map(e => e.target.value),
    sources.store
      .filter(data => data && data.locale)
      .map(data => data.locale)
  ])
  .map(data => ({type: 'changeLanguage', data}))

  const setAvailableLanguages$ = most.mergeArray([
    sources.i18n
      .filter(rawData => rawData.operation === 'getAvailableLanguages')
      .map(rawData => rawData.data)
  ])
  .map(data => ({type: 'setAvailableLanguages', data}))

  const toggleOptions$ = most.mergeArray([
    sources.dom.select('#toggleOptions').events('click')
  ])
  .map(data => ({type: 'toggleOptions', data}))

  // non visual related actions
  const setErrors$ = most.mergeArray([
    sources.solidWorker.filter(event => 'error' in event)
  ])
    .map(data => ({type: 'setErrors', data}))

  const clearErrors$ = most.never() /* sources.state$
    .filter(state => state.error !== undefined)
    .map(state => state.error)
    .skipRepeats()
    .map(x => undefined)
    .map(data => ({type: 'clearErrors', data}))
    .delay(30000) */
    // .forEach(x => console.log('clear errors', x))

  const setAppUpdatesAvailable$ = most.mergeArray([
    sources
      .appUpdates
      .map(data => ({type: 'setAppUpdatesAvailable', data})),
    sources
      .appUpdates
      .delay(15000)// hide after 30 s
      .map(data => ({type: 'setAppUpdatesAvailable', data: {available: false}}))
  ])

  return {
    // generic key shortuct handler
    actionsFromKey$,
    // set shortcut(s)
    setShortcuts$,
    setShortcut$,
    // generic clear error action
    clearErrors$,
    setErrors$,
    // app updates
    setAppUpdatesAvailable$,
    // translations
    setAvailableLanguages$,
    // ui
    changeTheme$,
    changeLanguage$,
    toggleOptions$
  }
}

module.exports = makeActions
