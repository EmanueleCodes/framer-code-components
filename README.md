# Framer Code Components

A collection of custom Framer Code Components and development resources.

## Structure

### `/next-dev/`
Next.js development environment containing all Framer Code Components. This is where you develop and test your components before using them in Framer.

### `/how-to-build-framer-components/`
Documentation and guides for building Framer components, including:
- Canvas sizing fixes
- Color handling in Framer Canvas
- Overrides and components workflow
- Props live rendering fixes
- Preview behavior
- Value mapping
- Framer University resources

### `/custom-bundle-gsap/`
Example and documentation for creating custom bundles of external libraries for use in Framer. See `readme.md` inside for detailed instructions.

### `/PATTERNS.md`
Component patterns and bug fix recipes for common issues encountered while building Framer Code Components.

## Getting Started

1. Navigate to `next-dev/` directory
2. Install dependencies: `npm install` or `pnpm install`
3. Run the development server: `npm run dev`
4. Open `http://localhost:3000` to view and test components

## Creating Custom Bundles

For instructions on bundling external libraries for Framer, see `/custom-bundle-gsap/readme.md`.

## Syncing Between Devices

This repository is set up for seamless syncing between multiple devices via GitHub:

1. Clone the repository on your new device
2. Run `npm install` or `pnpm install` in the `next-dev/` directory
3. All components and documentation will be available

## Notes

- All bundle folders have been removed from this repository (they should be hosted separately on GitHub)
- The `custom-bundle-gsap/` folder is kept as a reference for creating new bundles
- Node modules and build outputs are ignored by git

