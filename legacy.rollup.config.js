import json from 'rollup-plugin-json'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import { terser } from 'rollup-plugin-terser'

export default {
  input: 'src/legacy/index.mjs',
  output: {
    file: 'qc-tools-legacy.min.mjs',
    format: 'esm'
  },
  plugins: [
    json({
      preferConst: true,
      compact: true,
      namedExports: false
    }),
    resolve(),
    commonjs()
    // terser({ output: { comments: /^\**!|@preserve|@license|@cc_on/i } })
  ]
}
