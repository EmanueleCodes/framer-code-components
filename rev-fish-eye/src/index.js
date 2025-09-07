// Import Three.js and React Three Fiber components
import { Canvas } from '@react-three/fiber'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, ShaderMaterial, MeshBasicMaterial, SRGBColorSpace, Vector2, Vector3, AdditiveBlending } from 'three'

// Export the Canvas component and other utilities
export { Canvas }
export { useFrame, useThree }
export { Mesh, ShaderMaterial, MeshBasicMaterial, SRGBColorSpace, Vector2, Vector3, AdditiveBlending }

// Export Three.js core classes that might be needed
export { Scene, PerspectiveCamera, WebGLRenderer, PlaneGeometry, TextureLoader, LinearFilter, ClampToEdgeWrapping } from 'three'
