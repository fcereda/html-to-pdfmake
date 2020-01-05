'use strict';

function getTextContent (node) {
  let text = node.textContent.replace('\n', '')
  if (!text.trim().length)
    return ''
  return text
}  

function getClassList (node) {
  let classList = node.classList
  if (classList && classList.length) {
    let classes = []
    for (let i = 0; i < classList.length; i++)
      classes.push(classList[i])
    return classes  
  }
}

function isArray (obj) {
  return Array.isArray(obj)
}

function isObject (obj) {
  return typeof obj == 'object' && !isArray(obj)
}

function isString (obj) {
  return typeof obj == 'string'
}

function styleIncludes (obj, styleToTest) {
  if (obj.style && isArray(obj.style))
    return obj.style.includes(styleToTest)
  else
    return obj.style == styleToTest
  return false
}

function mergeStyles (style1, style2) {
  if (!style1 || !style2) {
    return style1 || style2
  }  
  let newStyles = []
  const addStyleToNewStyles = function (style) {
    if (!Array.isArray(style)) {
      newStyles.push(style)
    }
    else {
      newStyles = newStyles.concat(style)
    }  
  }
    
  addStyleToNewStyles(style1)
  addStyleToNewStyles(style2)
  return newStyles
}

function addStylesToObject (obj, styles) {
  if (typeof obj == 'string') {
    obj = {
      text: obj,
      style: styles
    } 
    return obj
  }
  obj.style = mergeStyles(obj.style, styles)
  return obj
}


function flattenObj (obj) {
  if (!isObject(obj)) return
  if (isArray(obj.text) || typeof(obj.text) == 'string') return
  let {text, italics, bold, strike, underline, decoration, margin, style, width} = obj.text
  if (obj.margin && margin) return // cannot flatten if we have a margin in both the outer and inner objects 
  obj.text = text
  obj.italics = obj.italics || italics
  obj.bold = obj.bold || bold
  obj.strike = obj.strike || strike
  obj.underline = obj.underline || underline
  obj.decoration = mergeStyles(obj.decoration, decoration)
  obj.margin = obj.margin || margin
  obj.style = mergeStyles(obj.style, style)
  obj.width = obj.width || width
  if (isObject(obj.text)) {
    flattenObj(obj)
  } 
}


function propagateProperties (obj, styles) {
  
  const addStylesToObject = function (obj, styles) {
    if (obj.bold === undefined) obj.bold = styles.bold
    if (obj.italics === undefined) obj.italics = styles.italics
    if (obj.underline === undefined) obj.underline = styles.underline
    if (obj.strike === undefined) obj.strike = styles.strike
  }

  if (!styles.bold && !styles.italics && !styles.underline && !styles.strike) {
    return obj  // Returns immediately if there are no styles to propagate
  }
  
  if (typeof obj == 'object' && !Array.isArray(obj)) {
    addStylesToObject(obj, styles)
  }

  styles = {...styles, ...obj}
  if (typeof obj.text == 'object') {
    if (Array.isArray(obj.text)) {
      // obj.text is an array
      let arr = obj.text
      for (let i = 0; i < arr.length; i++) {
        let node = arr[i]
        if (typeof(node) == 'string' || Array.isArray(node)) {
          arr[i] = { text: node }
          addStylesToObject(arr[i], styles)
        } 
        propagateProperties(arr[i], styles)
      }
    }
    else {
      addStylesToObject(obj.text, styles)
    }
  }    
  else {
    if (typeof obj.text == 'string') {
      // Se entrar aqui, obj.text é uma string. Basta adicionar os estilos ao objeto atual
      addStylesToObject(obj, styles)
      // NA VERDADE NÃO É NECESSÁRIO PORQUE JÁ ADICIONAMOS ESSES ESTILOS NO COMEÇO DA FUNÇÃO
    }
  }
}    


function propagateStyles (obj, styles) {
  let newStyles = mergeStyles(obj.styles, styles)
  //styles = {...styles, ...obj}
  if (typeof obj.text == 'object') {
    if (isArray(obj.text)) {
      // obj.text is an array
      let arr = obj.text
      for (let i = 0; i < arr.length; i++) {
        let node = arr[i]
        if (typeof(node) == 'string' || Array.isArray(node)) {
          arr[i] = { text: node }
          addStylesToObject(arr[i], styles)
        } 
        propagateStyles(arr[i], styles)
      }
    }
    else {
      // obj.text is an object
      addStylesToObject(obj.text, styles)
    }
  }    
  else {
    if (typeof obj.text == 'string') {
      // Se entrar aqui, obj.text é uma string. Basta adicionar os estilos ao objeto atual
      addStylesToObject(obj, styles)
    }
  }
}

function generateTableFromNode (tableNode) {
  let body = tableNode.text
  let numRows = 0
  let numCols = 0
  let rows = []
  let widths = []
  let headerRows = 0
  let footerRows = 0
  
  // Creates a rows array containing all rows
  // Also calculates numRows, headerRows and footerRows
  for (let i = 0; i < body.length; i++) {
    let rowsInThisSegment = body[i].length
    numRows += rowsInThisSegment
    rows = [...rows, ...body[i]]
    if (body[i].header) {
      headerRows += rowsInThisSegment
    }
    if (body[i].footer) {
      footerRows += rowsInThisSegment
    }
  }
  // Calculates numCols (must take all the colSpans into account)
  for (let i = 0; i < rows.length; i++) {
    let row = rows[i]
    let colsInThisRow = row.length
    for (let j = 0; j < row.lenght; j++) {
      let cell = row[j]
      let colSpan = cell.colSpan || 1
      colsInThisRow += (colSpan - 1)
    }
    numCols = Math.max(numCols, colsInThisRow)
  }
  
  // Generates a numRows x numCols matrix populated with ''
  let tableBody = Array(numRows).fill(0).map(row => Array(numCols).fill(''))

  // Populates the matrix from data in the rows array
  for (let i = 0; i < rows.length; i++) {
    let colNumber = 0
    let rowNumber = i
    let row = rows[rowNumber]
    
    for (let j = 0; j < row.length; j++) {
      while (tableBody[rowNumber][colNumber]) {
        colNumber += 1
      }
      if (colNumber >= numCols) {
        break
      }  
      let cell = row[j]
      tableBody[rowNumber][colNumber] = cell 
      if (cell.rowSpan && cell.rowSpan > 1) {
        for (let k = 1; k < cell.rowSpan; k++) {
          if (rowNumber + k < numRows) {
            tableBody[rowNumber + k][colNumber] = {}
          }  
        }
      }
      if (cell.colSpan && cell.colSpan > 1) {
        for (let k = 0; k < cell.colSpan - 1; k++) {
          colNumber += 1
          tableBody[rowNumber][colNumber] = {}
        }
      }
      colNumber += 1
    }
  }
  // Calculate the widths array
  for (let colNumber = 0; colNumber < numCols; colNumber++) {
    let width = 'auto'
    for (let rowNumber = 0; rowNumber < numRows; rowNumber++) {
      if (tableBody[rowNumber][colNumber].width) {
        //width = parseFloat(tableBody[rowNumber][colNumber].width)
        width = convertWidth(tableBody[rowNumber][colNumber].width)
        break
      }
    }
    widths.push(width)
  }
  
  const table = {
    body: tableBody,
    headerRows,
    footerRows,
    widths
  }
  return table
}

function convertWidth (width) {
  const DPI = 96
  if (typeof width == 'number') 
    return width
  
  const regex = /([\d|\.]{1,})\s*(px|in|cm|mm|pt|pc|em|rem|ex|ch|%|)/
  const widthComponents = regex.exec(width)
  let widthNumber = parseFloat(widthComponents[1])
  let widthUnit = widthComponents[2]
  if (!widthNumber) 
    return 'auto'
  if (widthUnit == '%') 
    return `${widthNumber}${widthUnit}`  
  switch (widthUnit) {
    case null:
    case '':
    case 'px':
      return widthNumber
    case 'in':
      return widthNumber * DPI
    case 'cm':
      return widthNumber * DPI / 2.54
    case 'mm':
      return widthNumber * DPI / 25.4
    case 'pt':
      return widthNumber * 4 / 3
    case 'pc':
      return widthNumber * 16
  }
  return widthNumber
}


function adjustUnderlineAndStrike (obj) {
  if (!obj) return
  
  if (isObject(obj)) {
    if (obj.underline) {
      obj.decoration = 'underline'
      delete obj.underline
    }
    if (obj.strike) {
      if (obj.decoration)
        obj.decoration = [obj.decoration, 'lineThrough']
      else  
        obj.decoration = 'lineThrough'
      delete obj.strike
    }
    if (obj.text)
      adjustUnderlineAndStrike(obj.text)
    else if (obj.table)
      adjustUnderlineAndStrike(obj.table)
    else if (obj.body)
      adjustUnderlineAndStrike(obj.body)
    else if (obj.ul)
      adjustUnderlineAndStrike(obj.ul)
    else if (obj.ol)
      adjustUnderlineAndStrike(obj.ol)
  }
  else if (isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      adjustUnderlineAndStrike(obj[i])
    }
  }
  return obj
}
 
function htmlToPdfmake (element, atRoot, callback) {
  var arr = []
  var nodes = element.childNodes
  var elementName = element.nodeName
  var objectsToAddToTheEnd = []
  
  const useStylesForBoldAndItalic = false
  
  const addLine = function (text = '\n') {
    arr.push(text)
  }

  const addLineToTheEnd = function (text = '\n') {
    objectsToAddToTheEnd.push(text)
  }
  
  const addObjectsToTheEnd = function () {
    for (let i = 0; i < objectsToAddToTheEnd.length; i++) {
      arr.push(objectsToAddToTheEnd[i])
    }
    objectsToAddToTheEnd = []
  }

  const addPropertyToObj = function (obj, name, value) {
    if (!obj || !name) return
    if (typeof obj == 'string' || Array.isArray(obj)) {
      obj = {
        text: obj
      }
    }
    obj[name] = value
    return obj
  }
  
  const objHasOnlyTextProperty = function (obj) {
    // if obj.text is "", it will be falsy but still is a part of the object
    return (obj.text != undefined) && !obj.italics && !obj.bold && !obj.underline && !obj.strike && !obj.style && !obj.colSpan && !obj.rowSpan && !obj.width
  }

  for (let i = 0; i < nodes.length; i++) {
    const isFirstNode = (arr.length == 0)
    const isLastNode = (i == nodes.length - 1)
    const node = nodes[i]
    const nodeName = node.nodeName
    let obj = {
      text: node.hasChildNodes() ? htmlToPdfmake(node, false, callback) : getTextContent(node),
      style: getClassList(node)
    }
    
    if (nodeName == 'TABLE') {
      addLine()  
      obj = {
        table: generateTableFromNode(obj),
        layout: 'lightHorizontalLines',
        style: 'table',
      }
    }
    if (nodeName == 'TBODY' || nodeName == 'THEAD' || nodeName == 'TFOOT' || nodeName == 'TR') {
      obj = obj.text
      if (nodeName == 'THEAD') obj.header = true
      if (nodeName == 'TFOOT') obj.footer = true
    }
    if (nodeName == 'TH') {
      obj = addPropertyToObj(obj, 'style', 'tableHeader')
    }
    if (nodeName == 'TD') {
      if (node.colSpan && node.colSpan > 1) {
        obj = addPropertyToObj(obj, 'colSpan', node.colSpan)       
      }
      if (node.rowSpan && node.rowSpan > 1) {
        obj = addPropertyToObj(obj, 'rowSpan', node.rowSpan)
      }
      if (node.style.width) {
        obj = addPropertyToObj(obj, 'width', node.style.width)
      }
      flattenObj(obj)
    }
    
    
    if (nodeName == 'UL' || nodeName == 'OL') {
      let listType = nodeName.toLowerCase()
      obj[listType] = obj.text
      delete obj.text
      if (!isFirstNode) {
        addLine()
      }  
    }
    if (nodeName == 'LI') {
      obj = obj.text
      flattenObj(obj)
    }  
    if (nodeName == 'BR') {
      obj.text = '\n'
    }  
    if (nodeName == 'P' || nodeName == 'H1' || nodeName == 'H2' || nodeName == 'H3') {
      if (isLastNode) {
        addLineToTheEnd()
      }  
      if (!isFirstNode) {
        addLine()
      }
      if (typeof obj.text != 'string') {
        if (!Array.isArray(obj.text)) {
          //debugger
          //obj.text = [obj.text]    VAMOS VER COMO FICA SEM ISSO
          
          // Se entrar aqui, obj.text é um objeto (não é um array)
          flattenObj(obj)
        }  
      }  
      
      obj.style = mergeStyles(obj.style, nodeName.toLowerCase())
    }    
    if (nodeName == 'EM' || nodeName == 'I') {
      if (useStylesForBoldAndItalic) {
        obj.style = mergeStyles(obj.styles, 'italics')
        propagateStyles(obj, 'italics')
      }
      else {
        obj.italics = true
        propagateProperties(obj, { italics: true })
      }  
    }
    if (nodeName == 'STRONG' || nodeName == 'B') {
      if (useStylesForBoldAndItalic) {
        obj.bold = mergeStyles(obj.styles, 'bold')
        //debugger
        propagateStyles(obj, 'bold')
      }
      else {
        obj.bold = true
        propagateProperties(obj, { bold: true })
      }
    } 
    if (nodeName == 'U') {
      obj.underline = true
      propagateProperties(obj, { underline: true })
    }
    if (['DEL', 'STRIKE', 'S'].includes(nodeName)) {
      obj.strike = true
      propagateProperties(obj, { strike: true })
    }
    
    if (nodeName == 'A') {
      obj = addPropertyToObj(obj, 'link', node.href)
      obj = addPropertyToObj(obj, 'style', 'link')
    }
    
    if (nodeName == 'BLOCKQUOTE') {
      obj.style = 'blockquote'
    }

    if (!obj.text && !['UL', 'OL', 'LI', 'TABLE', 'TBODY', 'THEAD', 'TR', 'TFOOT', 'TD'].includes(nodeName)) {
      continue
    }  
   
    let newObj = callback(obj, node)
    if (newObj) {
      obj = newObj
    }
   
   
    if (objHasOnlyTextProperty(obj)) {
      arr.push(obj.text)
    }
    else {
      arr.push(obj)
    }
    addObjectsToTheEnd()
  }

  
  //const atRoot = !element
  if (atRoot) {
    arr = adjustUnderlineAndStrike(arr)
    document.getElementById("demo").innerHTML = JSON.stringify(arr)
  }
  
  const forceReturnArray = ['TABLE', 'TFOOT', 'THEAD', 'TBODY', 'TR'].includes(elementName)
  if (arr.length == 1 && !forceReturnArray)
    return arr[0]
  else   
    return arr
}  


let numeroParagrafo = 0

  const hackishCallback = function (obj, node) {
    let nodeName = node.nodeName
    if (nodeName == 'OL') 
      return hackishProcessOL(obj)
    if (nodeName == 'P')
      return hackishProcessP(obj) 
  }

  function hackishProcessOL (obj) {
    let tableBody = obj.ol.map((item, index) => {
      return [
        {
          text: `${index + 1})`,
          alignment: 'right'
    },
        item,
      ]
    })
    let newObj = {
      table: {
        body: tableBody 
      },
      layout: 'noBorders'
    }
    return newObj
  }

  function hackishProcessP (obj) {
    if (!isObject(obj))
      return
    if (!styleIncludes(obj, 'numerado')) 
      return
    numeroParagrafo += 1
    const prefixo = numeroParagrafo + '.\t' 
    if (obj.text) {
      if (isString(obj.text))
        obj.text = prefixo + obj.text
      else if (isArray(obj.text))
        obj.text = [prefixo, ...obj.text]
    }
    else {
      if (isString(obj)) {
        return {
          text: prefixo + obj
        }
      }
    }
    return obj 
  }


function parseHTML () {
  let rootElement = document.getElementById('content')
  console.log(rootElement.childNodes)
  numeroParagrafo = 0
  let pdfObj = htmlToPdfmake(rootElement, true, hackishCallback)
  console.log(pdfObj)
}