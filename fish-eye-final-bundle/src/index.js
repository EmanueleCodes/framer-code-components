// Import Three.js and React Three Fiber components
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Mesh, ShaderMaterial, Vector2, Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, TextureLoader, LinearFilter, ClampToEdgeWrapping, SRGBColorSpace, AdditiveBlending } from 'three'

// Export the Canvas component and other utilities
export { Canvas }
export { useFrame, useThree, useTexture }
export { Mesh, ShaderMaterial, Vector2 }

// Export Three.js core classes that might be needed
export { Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, TextureLoader, LinearFilter, ClampToEdgeWrapping, SRGBColorSpace, AdditiveBlending }
