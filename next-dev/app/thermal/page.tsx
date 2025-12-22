'use client'
import React from 'react'
import { Heatmap } from '@paper-design/shaders-react'
import CustomHeatmap from './custom-heatmap'

const page = () => {
  return (
    <div className='h-screen w-screen flex items-center justify-center bg-stone-500'>
      <div className='grid grid-cols-3 gap-4'>
        {/* Original working component */}
        <div className='text-center'>
          <h2 className='text-white mb-4'>Original Heatmap</h2>
          <Heatmap
            colors={['#11206a', '#1f3ba2', '#2f63e7', '#6bd7ff', '#ffe679', '#ff991e', '#ff4c00']}
            colorBack="#00000000"
            speed={1}
            contour={0.5}
            angle={0}
            noise={0.05}
            innerGlow={0.5}
            outerGlow={0.5}
            scale={0.75}
            image="https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png"
            frame={0}
            style={{ backgroundColor: '#000000', borderRadius: '12px', height: '300px', width: '300px' }}
          />
        </div>

        {/* Static component for comparison */}
        <div className='text-center'>
          <h2 className='text-white mb-4'>Static Custom</h2>
          <CustomHeatmap
            colors={['#11206a', '#1f3ba2', '#2f63e7', '#6bd7ff', '#ffe679', '#ff991e', '#ff4c00']}
            colorBack="#00000000"
            speed={1}
            contour={0.5}
            angle={0}
            noise={0.05}
            innerGlow={0.5}
            outerGlow={0.5}
            scale={0.75}
            image="https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png"
            frame={0}
            mouseInfluence={0} // No mouse interaction
            style={{ backgroundColor: '#000000', borderRadius: '12px', height: '300px', width: '300px', cursor: 'default' }}
          />
        </div>
        
        {/* Mouse-interactive component */}
        <div className='text-center'>
          <h2 className='text-white mb-4'>Mouse Interactive</h2>
          <p className='text-gray-400 text-sm mb-4'>Move your mouse!</p>
          <CustomHeatmap
            colors={['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff', '#0066ff', '#6600ff']}
            colorBack="#00000000"
            speed={1.5}
            contour={0.8}
            angle={15}
            noise={0.15}
            innerGlow={0.8}
            outerGlow={0.8}
            scale={0.75}
            image="https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png"
            frame={0}
            mouseInfluence={1.0} // Full mouse interaction
            style={{ backgroundColor: '#000000', borderRadius: '12px', height: '300px', width: '300px', cursor: 'crosshair' }}
          />
        </div>
      </div>
    </div>
  )
}

export default page