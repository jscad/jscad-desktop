const callBackToStream = require('../utils/observable-utils/callbackToObservable')

// adapted from https://gist.github.com/gmarcos87/565d57747b30e1755046002137228562
const path = require('path')
const baseTranslation = 'en'
const localesPath = path.join(__dirname, '..', '..', 'locales')

const genericFile = require(path.join(localesPath, baseTranslation) + '.json')
// Load all translation in locales folder
let translations = {}
translations[baseTranslation] = genericFile
require('fs').readdirSync(localesPath).forEach((file) => {
  if (file.match(/\.json$/) !== null && baseTranslation + '.json' !== file) {
    let name = file.replace('.json', '')
    translations[name] = require(path.join(localesPath, file))
  }
})

const i18nImport = require('es2015-i18n-tag')
const i18n = i18nImport.default
const {i18nConfig} = i18nImport
// i18n, { i18nConfig }

/* i18nConfig({
    locales: 'de-DE',
    group: 'my-lib', // Optional, can be used to avoid configuration overrides. This is recommended for libraries!
    translations: {
        "Hello ${0}, you have ${1} in your bank account.": "Hallo ${0}, Sie haben ${1} auf Ihrem Bankkonto."
    },
    number: {
        [...options] // Intl NumberFormat options as described here: https://goo.gl/pDwbG2
    },
    date: {
        [...options] // Intl DateTimeFormat options as described here: https://goo.gl/lslekB
    }
})
*/
const makei18nSideEffect = (options) => {
  const translationsCB = callBackToStream()

  const i18nSink = (obs$) => {
    const changeSettings$ = obs$
      .filter(x => x.cmd === 'changeSettings')
      .multicast()

    changeSettings$
      .forEach(x => {
        const locales = x.data
        i18nConfig({
          locales,
          translations: translations[locales]
        })
        translationsCB.callback(i18n)
      })
  }
  const i18nSource = () => {
    // setup defaults
    const locales = require('electron').remote.app.getLocale().split('-')[0]
    i18nConfig({
      locales,
      translations: translations[locales]
    })
    return translationsCB.stream
      .startWith(i18n)
      .multicast()
  }
  return {i18nSink, i18nSource}
}

module.exports = makei18nSideEffect
