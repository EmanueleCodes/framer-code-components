import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import terser from "@rollup/plugin-terser"

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
      extensions: [".js", ".jsx", ".mjs"],
      dedupe: ["three", "react", "react-dom"],
    }),
    commonjs({
      include: /node_modules/,
      transformMixedEsModules: true,
    }),
    terser({
      format: { comments: false },
    }),
  ],
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "framer",
    "framer-motion",
    /^@framer\/.*/,
  ],
}
