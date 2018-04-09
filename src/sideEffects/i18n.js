// const i18next = require('i18next')
// adapted from https://gist.github.com/gmarcos87/565d57747b30e1755046002137228562
const path = require('path')
const baseTranslation = 'en'
const localesPath = path.join(__dirname, '..', '..', 'locales')
console.log('localesPath', localesPath)
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

console.log('translations', translations)

const {create} = require('@most/create')

const foo = require('es2015-i18n-tag')
const i18n = foo.default
const {i18nConfig} = foo
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

module.exports = getTranslations = (translationPaths) => {
  return create((add, end, error) => {
    i18next.init({
      lng: 'en',
      resources: translationPaths
    }, (err, t) => {
      if (err) {
        error(err)
      } else {
        add(t)
      }
    })
  })
}
*/

const makei18nSideEffect = (options) => {

  /* i18nConfig({
    locales: 'en-US',
    translations: de
  })
  console.log(i18n`hi`)
  console.log(i18n`${new Date()}:t(D)`)
  console.log(i18n`Storage`) */
  /* i18nConfig({
    locales: 'de-DE',
    translations: en
  })
  console.log(i18n`hi`)
  console.log(i18n`${new Date()}:t(D)`)
  console.log(i18n`Storage`) */

  // console.log(i18n`Hello ${name}, you have ${amount}:c in your bank account.`)

  const i18nSink = (obs$) => {
    const changeSettings$ = obs$
      .filter(x => x.cmd === 'changeSettings')
  }
  const i18nSource = (locales) => {
    i18nConfig({
      locales,
      translations: translations[locales]
    })
    return i18n
  }
  return {i18nSink, i18nSource}
}

module.exports = makei18nSideEffect
