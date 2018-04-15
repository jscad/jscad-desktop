const html = require('bel')

module.exports = function shortcuts (state, i18n) {
  const keybindings = state.shortcuts// require('../../../data/keybindings.json')
  const bindingsList = keybindings.map((binding, index) => {
    const {command, key, args} = binding
    return html`
    <tr>
        <td>${i18n.translate(command)}: ${i18n.translate(args)}</td>
        <td>
          <input type='text' class='shortcutCommand' 
            data-command=${command}
            data-args=${args}
            data-index=${index}
            placeholder='${i18n.translate(key)}: type & hit enter'
          />
        </td>
        <td>${i18n`always`}</td>
      </tr>
    `
  })

  return html`
<section id='shortcuts'>   
  <h3> ${i18n`keyboard shortcuts`} </h3>
  <table>
    <thead>
      <tr>
        <th>${i18n`command`}</th>
        <th>${i18n`keybinding`}</th>
        <th>${i18n`when`}</th>
      </tr>
    </thead>
    <tbody>
      ${bindingsList}
    </tbody>
  </table>
</section>`
}
