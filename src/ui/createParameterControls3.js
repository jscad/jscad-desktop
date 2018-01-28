// getParamDefinitions(script)
const html = require('bel')

const createParamControls = (prevParamValues = {}, paramDefinitions, instantUpdate, rebuildSolid) => {
  let paramControls = []
  let results = []

  const controls = paramDefinitions.map(function (paramDefinition) {
    let type = paramDefinition.type.toLowerCase()
    let control
    // console.log('type', type)
    switch (type) {
      case 'choice':
        control = createChoiceControl(paramDefinition, prevParamValues[paramDefinition.name])
        break
      case 'group':
        // control = createGroupControl(paramDefinition)
        break
      default:
        // console.log('other')
        control = createControl(paramDefinition, prevParamValues[paramDefinition.name])
        break
    }
    let label = paramDefinition.name + ':'
    let className = ''
    if ('caption' in paramDefinition) {
      label = paramDefinition.caption
      className = 'caption'
    }

    control.onchange = function (e) {
      let l = e.currentTarget.nextElementSibling
      if (l !== null && l.nodeName === 'LABEL') {
        l.innerHTML = e.currentTarget.value
      }
      if (instantUpdate === true && rebuildSolid) {
        rebuildSolid(paramControls)
      }
    }

    return html`<tr>
      <td class=${className} > ${label}</td>
      <td>${control}</td>
    </tr>`
  })

  return {controls}

  /* for (let i = 0; i < paramDefinitions.length; i++) {

    let control = null
    let type = paramdef.type.toLowerCase()
    switch (type) {
      case 'choice':
        control = createChoiceControl(paramdef, prevParamValues[paramdef.name])
        break
      case 'group':
        control = createGroupControl(paramdef)
        break
      default:
        control = createControl(paramdef, prevParamValues[paramdef.name])
        break
    }
    // add the appropriate element to the table
    let tr = document.createElement('tr')
    if (type === 'group') {
      let th = document.createElement('th')
      if ('className' in control) {
        th.className = control.className
      }
      th.innerHTML = control.text
      tr.appendChild(th)
    } else {
      // implementing instantUpdate
      control.onchange = function (e) {
        let l = e.currentTarget.nextElementSibling
        if (l !== null && l.nodeName === 'LABEL') {
          l.innerHTML = e.currentTarget.value
        }
        if (instantUpdate === true && rebuildSolid) {
          rebuildSolid(paramControls)
        }
      }
      paramControls.push(control)

      let td = document.createElement('td')
      let label = paramdef.name + ':'
      if ('caption' in paramdef) {
        label = paramdef.caption
        td.className = 'caption'
      }
      td.innerHTML = label
      tr.appendChild(td)
      td = document.createElement('td')
      td.appendChild(control)
      if ('label' in control) {
        td.appendChild(control.label)
      }
      tr.appendChild(td)
    }

    results.push(tr)
  }
  return {controls: results, paramControls} */
}

const createGroupControl = definition => {
  let control = document.createElement('title')
  control.paramName = definition.name
  control.paramType = definition.type
  if ('caption' in definition) {
    control.text = definition.caption
    control.className = 'caption'
  } else {
    control.text = definition.name
  }
  return control
}

const createChoiceControl = (definition, prevValue) => {
  if (!('values' in definition)) {
    throw new Error('Definition of choice parameter (' + definition.name + ") should include a 'values' parameter")
  }
  console.log('choice', definition, prevValue)
  const options = definition.captions.map(function (caption, index) {
    const value = definition.values[index]
    const selected = prevValue !== undefined ? prevValue === value : index === 0
    return html`<option value=${value} selected=${selected}>
      ${caption}
    </option>`
  })
  let control = html`<select>
    ${options}
  </select` // document.createElement('select')
  control.paramName = definition.name
  control.paramType = definition.type

  return control
  let values = definition.values
  let captions
  if ('captions' in definition) {
    captions = definition.captions
    if (captions.length !== values.length) {
      throw new Error('Definition of choice parameter (' + definition.name + ") should have the same number of items for 'captions' and 'values'")
    }
  } else {
    captions = values
  }

  let selectedindex = 0
  for (let valueindex = 0; valueindex < values.length; valueindex++) {
    let option = document.createElement('option')
    option.value = values[valueindex]
    option.text = captions[valueindex]
    control.add(option)
    if (prevValue !== undefined) {
      if (prevValue === values[valueindex]) {
        selectedindex = valueindex
      }
    } else if ('default' in definition) {
      if (definition['default'] === values[valueindex]) {
        selectedindex = valueindex
      }
    } else if ('initial' in definition) {
      if (definition.initial === values[valueindex]) {
        selectedindex = valueindex
      }
    }
  }
  if (values.length > 0) {
    control.selectedIndex = selectedindex
  }
  return control
}

const createControl = (definition, prevValue) => {
  // console.log('definition', definition)
  let controlList = [
    {type: 'text', control: 'text', required: ['index', 'type', 'name'], initial: ''},
    {type: 'int', control: 'number', required: ['index', 'type', 'name'], initial: 0},
    {type: 'float', control: 'number', required: ['index', 'type', 'name'], initial: 0.0},
    {type: 'number', control: 'number', required: ['index', 'type', 'name'], initial: 0.0},
    {type: 'checkbox', control: 'checkbox', required: ['index', 'type', 'name', 'checked'], initial: ''},
    {type: 'radio', control: 'radio', required: ['index', 'type', 'name', 'checked'], initial: ''},
    {type: 'color', control: 'color', required: ['index', 'type', 'name'], initial: '#000000'},
    {type: 'date', control: 'date', required: ['index', 'type', 'name'], initial: ''},
    {type: 'email', control: 'email', required: ['index', 'type', 'name'], initial: ''},
    {type: 'password', control: 'password', required: ['index', 'type', 'name'], initial: ''},
    {type: 'url', control: 'url', required: ['index', 'type', 'name'], initial: ''},
    {type: 'slider', control: 'range', required: ['index', 'type', 'name', 'min', 'max'], initial: 0, label: true}
  ]
  // check for required parameters
  if (!('type' in definition)) {
    throw new Error('Parameter definition (' + definition + ") must include a 'type' parameter")
  }
  let typeData = controlList.filter(x => definition.type === x.type)
  typeData = (typeData && typeData.length > 0) ? typeData[0] : undefined
  if (!typeData) {
    throw new Error('Parameter definition (' + definition + ') is not known')
  }

  let controlValue
  if (prevValue !== undefined) {
    controlValue = prevValue
  } else if ('initial' in definition) {
    controlValue = definition.initial
  } else if ('default' in definition) {
    controlValue = definition.default
  } else {
    controlValue = typeData.initial
  }
  let control = html`<input 
    type=${typeData.control} value=${controlValue} ${definition.checked ? 'checked=' : ''}> 
  </input>`
  control.paramName = definition.name
  control.paramType = definition.type
  // set generic HTML attributes
  for (let property in definition) {
    if (definition.hasOwnProperty(property)) {
      if (typeData.required.indexOf(property) < 0) {
        control.setAttribute(property, definition[property])
      }
    }
  }

  return control

  control = document.createElement('input')
  let i, j, controlInstance, paramName
  for (i = 0; i < controlList.length; i++) {
    controlInstance = controlList[i]
    if (controlInstance.type === definition.type) {
      for (j = 0; j < controlInstance.required.length; j++) {
        paramName = controlInstance.required[j]
        if (paramName in definition) {
          if (paramName === 'index') continue
          if (paramName === 'type') continue
          if (paramName === 'checked') { // setAttribute() only accepts strings
            control.checked = definition.checked
          } else {
            control.setAttribute(paramName, definition[paramName])
          }
        } else {
          throw new Error('Parameter definition (' + definition + ") must include a '" + paramName + "' parameter")
        }
      }
      break
    }
  }
  if (i === controlList.length) {
    throw new Error('Parameter definition (' + definition + ") is not a valid 'type'")
  }
  // set the control type
  control.setAttribute('type', controlInstance.control)
  // set name and type for obtaining values
  control.paramName = definition.name
  control.paramType = definition.type
  // determine initial value of control
  if (prevValue !== undefined) {
    control.value = prevValue
  } else if ('initial' in definition) {
    control.value = definition.initial
  } else if ('default' in definition) {
    control.value = definition.default
  } else {
    control.value = controlInstance.initial
  }
  // set generic HTML attributes
  for (let property in definition) {
    if (definition.hasOwnProperty(property)) {
      if (controlInstance.required.indexOf(property) < 0) {
        control.setAttribute(property, definition[property])
      }
    }
  }
  // add a label if necessary
  if ('label' in controlInstance) {
    control.label = document.createElement('label')
    control.label.innerHTML = control.value
  }
  return control
}

module.exports = {createParamControls}
