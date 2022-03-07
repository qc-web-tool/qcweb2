import replace from "rollup-plugin-replace";
import json from "rollup-plugin-json";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";

export default {
  input: "src/qcweb2-index.js",
  output: {
    file: "examples/qcweb2.min.js",
    format: "esm",
  },
  plugins: [
    replace({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
    json({
      preferConst: true,
      compact: true,
      namedExports: false,
    }),
    resolve(),
    commonjs({
      namedExports: {
        "node_modules/react/index.js": [
          "Component",
          "PureComponent",
          "Fragment",
          "Children",
          "cloneElement",
          "createElement",
          "forwardRef",
          "useState",
          "useCallback",
          "useContext",
          "useDebugValue",
          "useImperativeHandle",
          "useMemo",
          "useEffect",
          "useLayoutEffect",
          "useRef",
          "useReducer",
        ],
        "node_modules/react-is/index.js": [
          "isValidElementType",
          "isContextConsumer",
        ],
        "node_modules/react-dom/index.js": ["unstable_batchedUpdates"],
        "node_modules/react-redux/node_modules/react-is/index.js": [
          "isValidElementType",
          "isContextConsumer",
        ],
      },
    }),
    // terser({ output: { comments: /^\**!|@preserve|@license|@cc_on/i } })
  ],
};
