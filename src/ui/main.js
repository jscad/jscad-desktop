const html = require('bel')
const {createParamControls} = require('./createParameterControls3')

function dom (state, paramsCallbacktoStream) {
  const formatsList = state.availableExportFormats
    .map(function ({name, displayName}) {
      return html`<option value=${name} selected='${state.exportFormat === name}'>${displayName}</option>`
    })

  const {paramValues, paramDefinitions} = state.design
  const {controls} = createParamControls(paramValues, paramDefinitions, paramsCallbacktoStream.callback)

  const statusMessage = state.error !== undefined
    ? `Error: ${state.error.message} details:  ${state.error.stack}` : ''

  const output = html`
    <div id='container' style='color:${state.mainTextColor}'>
      <header>
        <section>
          <h3>JSCAD</h3>
        </section>
        <section class='designName'>
          <h3>${state.design.name}</h3>
        </section>
        <section>
        </section>
        <section>
          <input type="button" value="load jscad (.js or .jscad) file" id="fileLoader"/>
          <label for="autoReload">Auto reload</label>
            <input type="checkbox" id="autoReload" checked=${state.autoReload}/>
          <span id='exports'>
            <select id='exportFormats'>
            ${formatsList}
            </select>
            <input type='button' value="export" id="exportBtn"/>
        </span>
          
        </section>
      </header>
      <!--Status information/errors-->
      <span id='busy'>${state.busy ? 'processing, please wait' : ''}</span>
      <span id='status'>${statusMessage}</span>
      <!--Ui Controls-->
      <div id='controls'>
        
        <select id='themeSwitcher'>
          <option value='dark' selected=${state.themeName === 'dark'}>Dark Theme</option>
          <option value='light' selected=${state.themeName === 'light'}>Light Theme</option>
        </select>
        <label for="grid">Grid</label>
          <input type="checkbox" id="grid" checked=${state.viewer.grid.show}/>
        <label for="toggleAxes">Axes</label>
          <input type="checkbox" id="toggleAxes" checked=${state.viewer.axes.show}/>
        <label for="autoRotate">Autorotate</label>
          <input type="checkbox" id="autoRotate"/>
      </div>
      
      <!--Params-->
      <section id='params' style='visibility:${state.design.paramDefinitions.length === 0 ? 'hidden' : 'visible'}'>
        <span id='paramsMain'>
          <table>
            ${controls}
          </table>
        </span>
        <span id='paramsControls'>
          <button id='updateDesignFromParams'>Update</button>
          <label for='instantUpdate'>Instant Update</label>
          <input type='checkbox' checked='${state.instantUpdate}' id='instantUpdate'/>
        </span>
      </section>

      <!--Options-->
      <section id='options'>
        Options
        NOT functional yet !!!
        <table>
          <tr>
            <th>Timeout for solids generation</th>
            <th><input type='number' min=0 max=200000 value=${state.solidsTimeOut}/></th>
          </tr>
          <tr>
            <th>Zoom to fit</th>
            <th><input type='checkbox' checked=false/></th>
          </tr>
          <tr>
            <th>Storage path</th>
            <th>${state.storage.path}</th>
          </tr>
        </table>
        
      </section>

      <canvas id='renderTarget'> </canvas>
      
    </div>
  `
  return output
}

module.exports = dom
