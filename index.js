import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'

const code = 'const n=1'
const ast = parser.parse(code)

traverse(ast, {
  enter(path) {
    if (path.isIdentifier({ name: 'n' })) {
      path.node.name = 'x'
    }
  },
})

const output = generate(ast, code)
console.log(`原代码： 
${code}
转换后代码: 
${output.code}`)
