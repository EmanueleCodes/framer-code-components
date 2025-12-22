import React, { memo, useState, useCallback, useMemo } from 'react';
import { Heatmap } from '@paper-design/shaders-react';

interface CustomHeatmapProps {
  colors?: string[];
  colorBack?: string;
  speed?: number;
  contour?: number;
  angle?: number;
  noise?: number;
  innerGlow?: number;
  outerGlow?: number;
  scale?: number;
  image?: string;
  frame?: number;
  mouseInfluence?: number;
  style?: React.CSSProperties;
  className?: string;
}

const CustomHeatmap: React.FC<CustomHeatmapProps> = memo(function CustomHeatmap({
  colors = ['#11206a', '#1f3ba2', '#2f63e7', '#6bd7ff', '#ffe679', '#ff991e', '#ff4c00'],
  colorBack = "#00000000",
  speed = 1,
  contour = 0.5,
  angle = 0,
  noise = 0.05,
  innerGlow = 0.5,
  outerGlow = 0.5,
  scale = 0.75,
  image = "https://workers.paper.design/file-assets/01K2KEX78Z34EZ86R69T4CGNNX/01K4PRJY7A6KB5V1PXMR92Q9F4.png",
  frame = 0,
  mouseInfluence = 1.0,
  style,
  className,
  ...props
}) {
  // Mouse position state
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });

  // Mouse move handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  }, []);

  // Mouse leave handler - reset to center
  const handleMouseLeave = useCallback(() => {
    setMousePosition({ x: 0.5, y: 0.5 });
  }, []);

  // Calculate mouse-influenced props
  const mouseInfluencedProps = useMemo(() => {
    if (mouseInfluence === 0) {
      return {
        speed,
        contour,
        angle,
        noise,
        innerGlow,
        outerGlow,
        scale,
      };
    }

    // Mouse influence calculations
    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;
    
    // Speed influenced by mouse X position
    const mouseSpeed = speed * (1 + (mouseX - 0.5) * 0.5 * mouseInfluence);
    
    // Angle influenced by mouse X position
    const mouseAngle = angle + (mouseX - 0.5) * 30 * mouseInfluence;
    
    // Noise influenced by mouse Y position
    const mouseNoise = noise * (1 + (mouseY - 0.5) * 0.5 * mouseInfluence);
    
    // Inner glow influenced by mouse proximity to center
    const centerDistance = Math.sqrt((mouseX - 0.5) ** 2 + (mouseY - 0.5) ** 2);
    const mouseInnerGlow = innerGlow * (1 + (1 - centerDistance) * 0.5 * mouseInfluence);
    
    // Outer glow influenced by mouse Y position
    const mouseOuterGlow = outerGlow * (1 + (mouseY - 0.5) * 0.3 * mouseInfluence);
    
    // Scale influenced by mouse position
    const mouseScale = scale * (1 + (mouseX - 0.5) * 0.2 * mouseInfluence);
    
    // Contour influenced by mouse Y position
    const mouseContour = contour * (1 + (mouseY - 0.5) * 0.4 * mouseInfluence);

    return {
      speed: mouseSpeed,
      contour: mouseContour,
      angle: mouseAngle,
      noise: mouseNoise,
      innerGlow: mouseInnerGlow,
      outerGlow: mouseOuterGlow,
      scale: mouseScale,
    };
  }, [mousePosition, mouseInfluence, speed, contour, angle, noise, innerGlow, outerGlow, scale]);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      className={className}
    >
      <Heatmap
        {...props}
        colors={colors}
        colorBack={colorBack}
        image={image}
        frame={frame}
        {...mouseInfluencedProps}
      />
    </div>
  );
});

export default CustomHeatmap;