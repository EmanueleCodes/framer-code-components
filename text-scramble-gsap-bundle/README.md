# Text Scramble GSAP Bundle

A custom bundle containing all GSAP libraries needed for text scramble effects in Framer.

## What's Included

This bundle includes:
- **gsap**: Core GSAP library
- **@gsap/react**: useGSAP hook for React
- **gsap/SplitText**: For splitting text into individual characters
- **gsap/ScrambleTextPlugin**: For text scrambling effects

## Usage in Framer

Import the bundle in your Framer component:

```javascript
import { gsap, useGSAP, SplitText, ScrambleTextPlugin } from "https://raw.githubusercontent.com/your-username/text-scramble-gsap-bundle/main/dist/bundle.js";
```

## Example Usage

```javascript
'use client';

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, SplitText, ScrambleTextPlugin } from "https://raw.githubusercontent.com/your-username/text-scramble-gsap-bundle/main/dist/bundle.js";

// Register plugins
gsap.registerPlugin(SplitText, ScrambleTextPlugin, useGSAP);

// Your component code here...
```

## Building

To rebuild the bundle:

```bash
npm run build
```

This will create `dist/bundle.js` with all the necessary GSAP libraries bundled together.

## Dependencies

- React 18.2.0
- React DOM 18.2.0
- GSAP 3.13.0
- @gsap/react 2.1.2 