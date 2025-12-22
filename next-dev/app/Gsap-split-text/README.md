# GSAP Split Text with Masked Line-by-Line Reveal

This is a Next.js project demonstrating advanced GSAP split text animations with masked line-by-line reveals.

## Features

- **SplitText Plugin**: Uses GSAP's premium SplitText plugin for advanced text splitting
- **Masked Reveals**: Each line is revealed with a custom mask animation
- **Staggered Animations**: Words animate in with rotation and opacity effects
- **useGSAP Hook**: Properly integrated with React using the @gsap/react hook
- **Responsive Design**: Works on all screen sizes with Tailwind CSS

## Dependencies

- `gsap`: Core animation library
- `@gsap/react`: React integration for GSAP
- `next`: React framework
- `react`: UI library
- `tailwindcss`: CSS framework

## How It Works

1. **Text Splitting**: The SplitText plugin splits the text into lines and words
2. **Mask Creation**: Each line gets a custom mask element with gradient background
3. **Line-by-Line Reveal**: Masks animate from left to right to reveal each line
4. **Word Animation**: Words animate in with 3D rotation and opacity effects
5. **Staggered Timing**: Each line and word animates with calculated delays

## Animation Sequence

1. Line masks scale from 0 to 1 (left to right)
2. Words animate in with y-movement, opacity, and rotation
3. Each line has a 0.4s delay from the previous
4. Words have 0.05s stagger between each word

## Usage

Visit `/Gsap-split-text` in your Next.js app to see the animation in action.

Click the "Replay Animation" button to restart the animation sequence.

## Customization

You can modify the animation parameters in the `useGSAP` hook:

- `delay`: Time between line animations
- `duration`: Length of each animation
- `stagger`: Time between word animations
- `ease`: Animation easing function

## Technical Notes

- Uses `'use client'` directive for client-side rendering
- Properly registers the SplitText plugin with GSAP
- Implements proper TypeScript types
- Uses refs for DOM manipulation
- Includes error handling for missing elements 