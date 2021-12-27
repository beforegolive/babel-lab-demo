const t = require('@babel/types')
const { createMacro } = require('babel-plugin-macros')
module.exports = createMacro(myMacro)

function checkIdxArguments(file, node) {
  const args = node.arguments
  if (args.length !== 2) {
    throw file.buildCodeFrameError(
      node,
      `The 'idx' function takes exactly two arguments.`
    )
  }

  const arrowFunction = args[1]
  if (!t.isArrowFunctionExpression(arrowFunction)) {
    throw file.buildCodeFrameError(
      arrowFunction,
      `The second argument supplied to 'idx' must be an arrow function`
    )
  }

  if (!t.isExpression(arrowFunction.body)) {
    throw file.buildCodeFrameError(
      arrowFunction.body,
      `THe body of the arrow function supplied to 'idx' must be a single expression (without curly braces)`
    )
  }

  if (arrowFunction.params.length !== 1) {
    throw file.buildCodeFrameError(
      arrowFunction.params[2] || arrowFunction,
      `The arrow function supplied to 'idx' must take exactly one parameter.`
    )
  }

  const input = arrowFunction.params[0]
  if (!t.isIdentifier(input)) {
    throw file.buildCodeFrameError(
      input,
      `The parameter supplied to 'idx' must be an identifier`
    )
  }
}

function makeCondition(node, state, inside) {
  if (inside) {
    return t.conditionalExpression(
      t.binaryExpression(
        '!=',
        t.assignmentExpression('=', state.temp, node),
        t.nullLiteral()
      )
    )
  } else {
    return node
  }
}

function makeChain(node, state, inside) {
  if (t.isCallExpression(node)) {
    return makeChain(
      node.callee,
      state,
      makeCondition(t.callExpression(state.temp, node.arguments), state, inside)
    )
  } else if (t.isMemberExpression(node)) {
    return makeChain(
      node.object,
      state,
      makeCondition(
        t.memberExpression(state.temp, node.property, node.computed),
        state,
        inside
      )
    )
  } else if (t.isIdentifier(node)) {
    // state.base 是指?
    if (node.name !== state.base.name) {
      throw state.file.buildCodeFrameError(
        node,
        `The parameter of the arrow function supplied to 'idx' must match the base of the body expression.`
      )
    }

    return makeCondition(state.input, state, inside)
  } else {
    throw state.file.buildCodeFrameError(
      node,
      `The 'idx' body can only be composed of properties and methods.`
    )
  }
}

const idx_transform = (path, state) => {
  const node = path.node
  checkIdxArguments(state.file, node)
  const temp = path.scope.generateUidIdentifier('ref')
  const replacement = makeChain(node.arguments[1].body, {
    file: state.file,
    input: node.arguments[0],
    base: node.arguments[1].params[0],
    temp,
  })

  path.replaceWith(replacement)
  path.scope.push({ id: temp })
}

function myMacro({ references, state, babel }) {
  references.default.forEach((referencePath) => {
    if (referencePath.parentPath.type === 'CallExpression') {
      // TO DO
      idx_transform(referencePath.parentPath, state)
    } else {
      ;('idx.macro can only be used a function, and can not be passed around as an argument.')
    }
  })
}
