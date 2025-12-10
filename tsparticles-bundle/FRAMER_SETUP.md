# TSParticles Bundle - Framer Setup Guide

## Problem
The Sparkles component won't show particles in Framer Canvas because it needs to import from a bundled URL, not local npm packages.

## Solution

### Step 1: Push to GitHub
```bash
cd tsparticles-bundle
git init
git add .
git commit -m "Add tsparticles bundle for Framer"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Update Sparkles.tsx
Once pushed, update the import in `next-dev/app/sparkles/Sparkles.tsx`:

```typescript
// Replace this:
// import Particles, { initParticlesEngine } from "@tsparticles/react"
// import type { Container } from "@tsparticles/engine"
// import { loadSlim } from "@tsparticles/slim"

// With this (after pushing your bundle):
import Particles, { initParticlesEngine, loadSlim } from "https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-REPO/main/tsparticles-bundle/dist/bundle.js"
import type { Container } from "@tsparticles/engine"
```

### Step 3: Test in Framer Canvas
- Go to your Framer project
- Add the Sparkles component to the canvas
- Toggle "Preview" to ON
- You should now see particles!

## Bundle Exports
The bundle exports:
- `Particles` - React component for rendering particles
- `initParticlesEngine` - Function to initialize the particle engine
- `loadSlim` - Function to load the slim preset

## Notes
- The bundle is minified and optimized (~141KB)
- It includes all necessary tsparticles libraries
- React dependencies are externalized (Framer provides them)

