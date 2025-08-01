
1. mkdir threejs-bundle
2. cd threejs-bundle
3. npm init -y
4. npm i react-dom@18.2.0 react@18.2.0 && npm install --save-dev rollup @rollup/
plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-babel rollup-plugin-terser @babel/
preset-react
5. insert to package.json exact version of your libs && npm i or npm i <library>
6. create src/index.js
7. add imports of 3rd party libs
8. add export of libs
9. copy rollup.config.js
10. add build script to package.json
11. npm run build

# Creating Custom Bundles for Framer

This guide explains how to create custom bundles of external libraries to use in Framer. Since Framer doesn't allow direct imports of external libraries, you need to bundle them and host them on a public GitHub repository.

## Prerequisites

- Node.js and npm installed on your system
- A GitHub account for hosting the bundle
- Basic knowledge of JavaScript and npm

## Step-by-Step Guide

### 1. Create Project Directory
```bash
mkdir your-library-bundle
cd your-library-bundle
```

### 2. Initialize npm Project
```bash
npm init -y
```
This creates a `package.json` file with default values.

### 3. Install Core Dependencies
```bash
npm i react-dom@18.2.0 react@18.2.0
```
Install React and React DOM as peer dependencies. These are required for Framer compatibility.

### 4. Install Build Tools and Your Library
```bash
npm install --save-dev rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-babel rollup-plugin-terser @babel/preset-react
npm install your-library-name
```

**Explanation of build tools:**
- `rollup`: The bundler that combines your code into a single file
- `@rollup/plugin-node-resolve`: Resolves node modules
- `@rollup/plugin-commonjs`: Converts CommonJS modules to ES6
- `@rollup/plugin-babel`: Transpiles modern JavaScript
- `rollup-plugin-terser`: Minifies the output
- `@babel/preset-react`: Transpiles JSX

### 5. Update package.json with Exact Versions
Edit your `package.json` to include exact versions of your libraries. This ensures consistency:

```json
{
  "name": "your-library-bundle",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "build": "rollup -c"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "your-library": "^1.0.0"
  },
  "devDependencies": {
    "@babel/preset-react": "^7.27.1",
    "@rollup/plugin-babel": "^6.0.4",
    "@rollup/plugin-commonjs": "^28.0.6",
    "@rollup/plugin-node-resolve": "^16.0.1",
    "rollup": "^2.79.2",
    "rollup-plugin-terser": "^7.0.2"
  }
}
```

### 6. Create Source Directory and Entry File
```bash
mkdir src
```

Create `src/index.js` and add your library imports:

```javascript
// Import your library
import { libraryFunction } from "your-library";

// Export what you want to use in Framer
export { libraryFunction };
```

### 7. Create Rollup Configuration
Create `rollup.config.js` in your project root:

```javascript
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
```

**Key configuration points:**
- `format: "es"`: Outputs ES modules for browser compatibility
- `inlineDynamicImports: true`: Inlines dynamic imports
- `external`: Excludes React and Framer dependencies (they're provided by Framer)

**Important for Three.js libraries:**
If you're bundling Three.js or related libraries (like @react-three/fiber, @react-three/drei), you need to uncomment the `dedupe` option in the resolve plugin to prevent duplicate Three.js instances:

```javascript
resolve({
  browser: true,
  preferBuiltins: false,
  mainFields: ["browser", "module", "main"],
  extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs"],
  dedupe: ["three", "@react-three/fiber", "@react-three/drei"], // Uncomment this line
}),
```

### 8. Add Build Script
The build script should already be in your `package.json` from step 5:
```json
"scripts": {
  "build": "rollup -c"
}
```

### 9. Build Your Bundle
```bash
npm run build
```

This creates a `dist/bundle.js` file containing your bundled library.

### 10. Host on GitHub
1. Create a new public GitHub repository
2. Push your project to the repository
3. Create a release or use the raw file URL

### 11. Use in Framer
Import your bundle in Framer using the GitHub raw URL:

```javascript
import { libraryFunction } from "https://raw.githubusercontent.com/your-username/your-repo/main/dist/bundle.js";
```

## Example: GSAP Bundle

See the `gsap-test/` folder for a complete example of bundling GSAP:

- **package.json**: Contains GSAP and React dependencies
- **rollup.config.js**: Rollup configuration for bundling
- **src/index.js**: Imports and exports GSAP functions
- **dist/bundle.js**: The final bundled file (generated after build)

## Troubleshooting

### Common Issues:
1. **Module not found**: Ensure all dependencies are installed
2. **Build errors**: Check that your library is compatible with ES modules
3. **Import errors in Framer**: Verify the GitHub URL is correct and the file is accessible

### Tips:
- Test your bundle locally before pushing to GitHub
- Use exact versions in package.json for consistency
- Keep your bundle size minimal by only importing what you need
- Consider using a CDN like jsDelivr for better performance

## Next Steps

After creating your bundle:
1. Test it in a simple HTML file to ensure it works
2. Push to GitHub and verify the raw URL is accessible
3. Import and test in Framer
4. Share your bundle with the community if it's useful for others
