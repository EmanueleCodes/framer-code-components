// Minimal TSL Functions Bundle
// Only the 4 missing functions we need - NO Three.js imports

// oneMinus - TSL utility function
export const oneMinus = (value) => {
  // Return a TSL node-like object with .mul() method
  return {
    value: 1.0 - value,
    mul: (factor) => ({ value: (1.0 - value) * factor }),
    add: (other) => ({ value: (1.0 - value) + other }),
    sub: (other) => ({ value: (1.0 - value) - other }),
    div: (other) => ({ value: (1.0 - value) / other })
  }
}

// select - TSL conditional function  
export const select = (condition, a, b) => {
  // Return a TSL node-like object
  return {
    value: condition ? a : b,
    mul: (factor) => ({ value: (condition ? a : b) * factor }),
    add: (other) => ({ value: (condition ? a : b) + other }),
    sub: (other) => ({ value: (condition ? a : b) - other }),
    div: (other) => ({ value: (condition ? a : b) / other })
  }
}

// mx_cell_noise_float - MaterialX cell noise function
export const mx_cell_noise_float = (position, scale = 1.0) => {
  // Simple cell noise implementation
  const x = position.x * scale
  const y = position.y * scale
  const z = position.z || 0
  
  // Simple hash-based noise
  const hash = (x * 12.9898 + y * 78.233 + z * 37.719) % 1.0
  const noiseValue = Math.abs(Math.sin(hash * 3.14159)) * 2.0 - 1.0
  
  return {
    value: noiseValue,
    mul: (factor) => ({ value: noiseValue * factor }),
    add: (other) => ({ value: noiseValue + other }),
    sub: (other) => ({ value: noiseValue - other }),
    div: (other) => ({ value: noiseValue / other })
  }
}

// bloom - Simplified bloom function
export const bloom = (input, intensity = 1.0, threshold = 0.8) => {
  // Simplified bloom implementation
  return {
    input,
    intensity,
    threshold,
    value: input * intensity,
    mul: (factor) => ({ value: input * intensity * factor }),
    add: (other) => ({ value: input * intensity + other }),
    sub: (other) => ({ value: input * intensity - other }),
    div: (other) => ({ value: input * intensity / other })
  }
}

// Export all functions as a single object
export const MissingImportsBundle = {
  bloom,
  mx_cell_noise_float,
  oneMinus,
  select
}

// Default export
export default MissingImportsBundle 