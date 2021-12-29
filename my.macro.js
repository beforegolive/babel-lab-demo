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
      ),
      inside,
      state.temp
    )
  } else {
    return node
  }
}

/** 递归思路：
 * 依次遍历MemberExpression的body属性，并将当前节点做个转换并记录在inside参数中，依次传入
 *
 * inside思路：
 *  (_ref = props) != null ? "inside" : _ref
 * 第一步：
 *  _.arr[0].name -> _ref.name
 *
 * 第二步:
 * _.arr[0] -> (_ref=_ref[0]) != null ? _ref.name : _ref
 *
 * 第三步：
 * _.arr ->
 * (_ref=_ref.arr)!=null
 *  ? (_ref=_ref[0]) != null ? _ref.name : _ref
 *  : _ref
 *
 * 第四步: 【将_替换为props】
 *  _ ->
 *  (_ref = props) != null
 *  ? 【第三步的产出】
 *  : _ref
 */
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
    // state.base 是指：箭头函数的参数名，这里为'_'
    // 此处的判断可以将方法发起主体限制为传入参数。
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

// MyMacro(props, _=>_.arr[0].name)
const idx_transform = (path, state) => {
  const node = path.node
  checkIdxArguments(state.file, node)
  // path.scope表当前作用域
  const temp = path.scope.generateUidIdentifier('ref')
  const replacement = makeChain(node.arguments[1].body, {
    file: state.file, // 表语法树解析的上下文
    input: node.arguments[0], // 表示要转换的对象，对应参数props
    base: node.arguments[1].params[0], // 表示箭头函数中的参数名
    temp, // 表示声明的变量 var ref
  })

  path.replaceWith(replacement)
  // 把声明的变量添加到当前作用域中
  path.scope.push({ id: temp })
}

/** 测试代码上下文 
 *  `
      import MyMacro from './my.macro'
      const props = { arr:[{name:'123'}]}
      MyMacro(props, _=>_.arr[0].name)
    `,
 *  【重点参数解析】
 *  references: 
 *  default属性作为入口，切入点是自定义宏执行的那一个方法节点。
 *  比如下面的代码，切入点就是第三行MyMacro方法开始执行的地方，Identifier表达式。
 *  其中：
 *  parent属性指向父节点，即这行第三行函数
 *  parentPath属性指向父节点，基本通parent，但多了路径追溯，可以继续往上查节点
 * 
 *  state：
 *  file属性中含代码、ast语法树、babel插件信息等信息，解析元数据的核心参数
 * 
 *  babel:
 *  @babel/core依赖项的实例
 *
 * @param {*} { references, state, babel }
 */
function myMacro({ references, state, babel }) {
  references.default.forEach((referencePath) => {
    if (referencePath.parentPath.type === 'CallExpression') {
      idx_transform(referencePath.parentPath, state)
    } else {
      ;('idx.macro can only be used a function, and can not be passed around as an argument.')
    }
  })
}
