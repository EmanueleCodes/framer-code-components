# Three.js Fisheye Bundle

This bundle contains the necessary Three.js libraries for creating fisheye distortion effects in Framer.

## What's Included

- `three`: Core Three.js library
- `@react-three/fiber`: React renderer for Three.js
- `@react-three/drei`: Useful helpers for React Three Fiber (including Fisheye component)

## Usage in Framer

After building and hosting this bundle, you can import it in Framer like this:

```javascript
import { Canvas, Fisheye, PerspectiveCamera } from "https://raw.githubusercontent.com/your-username/your-repo/main/dist/bundle.js";
```

## Build Instructions

1. Install dependencies: `npm install`
2. Build the bundle: `npm run build`
3. The output will be in `dist/bundle.js`

## Example Usage

```javascript
import { useState } from 'react'
import { Canvas, Fisheye, PerspectiveCamera } from "your-bundle-url";

function FisheyeImageComponent() {
  const [zoom, setZoom] = useState(0)
  
  return (
    <Canvas flat>
      <Fisheye zoom={zoom}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <ambientLight intensity={1} />
        {/* Your image plane here */}
      </Fisheye>
    </Canvas>
  )
}
```

## Notes

- React and React DOM are excluded from the bundle (provided by Framer)
- The bundle includes proper deduplication for Three.js instances
- Optimized and minified for production use
