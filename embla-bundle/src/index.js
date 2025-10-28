// Embla Carousel Bundle for Framer
// This bundles all necessary Embla Carousel dependencies

// Import Embla Carousel React hook
import useEmblaCarousel from 'embla-carousel-react'

// Import Embla Carousel Autoplay plugin
import Autoplay from 'embla-carousel-autoplay'

// Import Embla Carousel Wheel Gestures plugin
import WheelGestures from 'embla-carousel-wheel-gestures'

// Export everything needed for Framer
// Note: Types (EmblaOptionsType, EmblaCarouselType) are TypeScript-only
// and will be available when using TypeScript in Framer
export { 
	useEmblaCarousel,
	Autoplay,
	WheelGestures
}

// Re-export types from embla-carousel for TypeScript users
export * from 'embla-carousel'

