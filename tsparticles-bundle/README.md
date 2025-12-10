# TSParticles Bundle for Framer

This bundle packages the TSParticles library for use in Framer code components.

## Included Libraries

- `@tsparticles/react` - React wrapper for TSParticles
- `@tsparticles/engine` - Core TSParticles engine
- `@tsparticles/slim` - Slim preset for TSParticles

## Usage in Framer

Once hosted on GitHub, import the bundle in your Framer component:

```javascript
import Particles, { initParticlesEngine, loadSlim } from "https://raw.githubusercontent.com/YOUR-USERNAME/YOUR-REPO/main/tsparticles-bundle/dist/bundle.js"
```

## Example Component

See the Sparkles component (`next-dev/app/sparkles/Sparkles.tsx`) for a complete example of using this bundle.

## Building

To rebuild the bundle after making changes:

```bash
npm run build
```

## Dependencies

- React 18.2.0
- @tsparticles/react ^3.0.0
- @tsparticles/engine ^3.9.1
- @tsparticles/slim ^3.9.1

