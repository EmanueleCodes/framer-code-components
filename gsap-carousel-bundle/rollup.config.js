import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { babel } from "@rollup/plugin-babel";
import { terser } from "rollup-plugin-terser";

export default {
  input: "src/index.js",
  output: {
    file: "dist/bundle.js",
    format: "es",
    inlineDynamicImports: true,
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false,
      mainFields: ["browser", "module", "main"],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs"],
    }),
    commonjs({
      include: /node_modules/,
      transformMixedEsModules: true,
    }),
    babel({
      babelHelpers: "bundled",
      presets: ["@babel/preset-react"],
      exclude: "node_modules/**",
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    }),
    terser({
      format: {
        comments: false,
      },
      compress: {
        drop_console: true,
      },
    }),
  ],
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "framer-motion",
    /^@framer\/.*/,
  ],
};
