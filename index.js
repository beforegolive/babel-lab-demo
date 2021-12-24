import * as babel from '@babel/core'

function myFirstPlugin() {
  return {
    visitor: {
      Identifier(path) {
        if (path.isIdentifier({ name: 'n' })) {
          path.node.name = 'x'
        }
      },
    },
  }
}

const code = 'const n=1'

const output = babel.transformSync(code, {
  plugins: [myFirstPlugin],
})

console.log(`原代码： 
${code}
转换后代码: 
${output.code}`)
