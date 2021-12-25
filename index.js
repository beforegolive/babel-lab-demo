import util from 'util'
import * as babel from '@babel/core'
import template from '@babel/template'

function myFirstPlugin() {
  return {
    visitor: {
      Identifier(path) {
        if (path.isIdentifier({ name: 'n' })) {
          path.node.name = 'x'
        }
      },
      FunctionDeclaration(path) {
        console.log('=== FunctionDeclaration node:', path.node)
        const paramNameIden = path.node.params[0]
        paramNameIden.name = 'y'
        console.log('=== paramNameIden', paramNameIden)
      },
      // BlockStatement(path) {
      //   console.log('=== BlockStatement node:', path.node)
      //   console.log('=== BlockStatement opts:', path.opts)
      // },
      // ReturnStatement(path) {
      //   console.log('=== ReturnStatement path:', path.node)
      // },
      BinaryExpression(path) {
        console.log('=== BinaryExpression path:', path.node)
        if (path.node.operator === '*') {
          console.log('*** path.node.operator ', path.node.operator)
          path.node.operator = '+'
        }
      },
      ExpressionStatement(path) {
        if (path.node.expression.name === 'aaa') {
          const target = `function myFunc(aaa){return aaa+1}`
          const ast = template.ast(target)
          path.replaceWith(ast)
        }
      },
    },
  }
}

// const code = `
// // 加点注释1
// function myFunc(n){
//   // 加点注释2
//   return n*n;
// };
// // 加点注释3

// const result = myFunc(10);
// `

// 自定义语法糖，尝试转换为自定义的函数
const code = `aaa`

const output = babel.transformSync(code, {
  plugins: [myFirstPlugin],
})

console.log(`原代码： 
${code}
转换后代码: 
${output.code}`)

const ast = template.ast(code)
const inspectObj = util.inspect(ast, { showHidden: true, depth: null, colors: true })
console.log(inspectObj)
