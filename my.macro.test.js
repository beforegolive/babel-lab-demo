import pluginTester from 'babel-plugin-tester'
import plugin from 'babel-plugin-macros'

// it('测试自定义宏', () => {
pluginTester({
  plugin,
  snapshot: true,
  babelOptions: { filename: __filename },
  tests: [
    `
      import MyMacro from './my.macro'
      const props = { arr:[{name:'123'}]}
      MyMacro(props, _=>_.arr[0].name)
    `,
  ],
})
// })
