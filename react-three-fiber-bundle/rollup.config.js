import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es',
    inlineDynamicImports: true,
  },
  plugins: [
    resolve({
      dedupe: ['@react-three/fiber']
    }),
    commonjs(),
    babel({
      presets: ['@babel/preset-react'],
      babelHelpers: 'bundled',
    }),
    terser(),
  ],
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'framer-motion',
    /^@framer\/.*/
  ],
}; 