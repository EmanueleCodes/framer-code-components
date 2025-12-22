"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface CarouselItem {
  id: string | number;
  content: React.ReactNode;
}

interface InfiniteCarouselProps {
  items: CarouselItem[];
  slideWidth?: number;
  gap?: number;
  autoPlay?: boolean;
  autoPlayDelay?: number;
  showArrows?: boolean;
  showDots?: boolean;
  dragSensitivity?: number;
  inertiaDuration?: number;
}

export const InfiniteCarousel: React.FC<InfiniteCarouselProps> = ({
  items,
  slideWidth = 300,
  gap = 20,
  autoPlay = false,
  autoPlayDelay = 3000,
  showArrows = true,
  showDots = true,
  dragSensitivity = 0.5,
  inertiaDuration = 0.6
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [duplicatedItems, setDuplicatedItems] = useState<CarouselItem[]>([]);
  const [slidesNeeded, setSlidesNeeded] = useState(0);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [velocity, setVelocity] = useState(0);
  const lastDragTime = useRef(0);
  const lastDragPosition = useRef(0);

  // Calculate how many slides we need to fill the container
  const calculateSlidesNeeded = useCallback(() => {
    if (!containerRef.current || items.length === 0) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const slideWithGap = slideWidth + gap;
    const visibleSlides = Math.ceil(containerWidth / slideWithGap);
    
    // We need at least 3 sets of slides for smooth infinite scroll
    const minSetsNeeded = Math.ceil((visibleSlides * 3) / items.length);
    const totalSlidesNeeded = minSetsNeeded * items.length;
    
    setSlidesNeeded(totalSlidesNeeded);
    
    // Create duplicated items array
    const duplicated: CarouselItem[] = [];
    for (let i = 0; i < minSetsNeeded; i++) {
      duplicated.push(...items);
    }
    setDuplicatedItems(duplicated);
    
    // Set initial position to middle set
    const middleSetStart = Math.floor(minSetsNeeded / 2) * items.length;
    setCurrentIndex(middleSetStart);
  }, [items, slideWidth, gap]);

  // Initialize and recalculate on resize
  useEffect(() => {
    calculateSlidesNeeded();
    
    const handleResize = () => calculateSlidesNeeded();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateSlidesNeeded]);

  // Get slide position
  const getSlidePosition = (index: number) => {
    return -(index * (slideWidth + gap)) + dragOffset;
  };

  // Handle infinite loop positioning
  const checkInfiniteLoop = useCallback(() => {
    if (duplicatedItems.length === 0) return;
    
    const setsCount = duplicatedItems.length / items.length;
    const setSize = items.length;
    const firstSetEnd = setSize;
    const lastSetStart = (setsCount - 1) * setSize;
    
    if (currentIndex >= lastSetStart) {
      // Jump to first set
      setCurrentIndex(setSize);
      setIsTransitioning(false);
    } else if (currentIndex < firstSetEnd) {
      // Jump to second-to-last set
      setCurrentIndex(lastSetStart - setSize);
      setIsTransitioning(false);
    }
  }, [currentIndex, duplicatedItems.length, items.length]);

  // Navigation functions
  const goToSlide = (index: number) => {
    if (isTransitioning || isDragging) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => {
      setIsTransitioning(false);
      checkInfiniteLoop();
    }, 300);
  };

  const nextSlide = () => {
    goToSlide(currentIndex + 1);
  };

  const prevSlide = () => {
    goToSlide(currentIndex - 1);
  };

  // Auto play functionality
  useEffect(() => {
    if (!autoPlay || isDragging) return;
    
    const interval = setInterval(nextSlide, autoPlayDelay);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayDelay, currentIndex, isDragging]);

  // Drag handlers
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    setDragOffset(0);
    lastDragTime.current = Date.now();
    lastDragPosition.current = clientX;
    setVelocity(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    
    const currentTime = Date.now();
    const timeDiff = currentTime - lastDragTime.current;
    const positionDiff = clientX - lastDragPosition.current;
    
    if (timeDiff > 0) {
      setVelocity(positionDiff / timeDiff);
    }
    
    const offset = (clientX - dragStart) * dragSensitivity;
    setDragOffset(offset);
    
    lastDragTime.current = currentTime;
    lastDragPosition.current = clientX;
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    const slideWithGap = slideWidth + gap;
    const threshold = slideWithGap * 0.3;
    const velocityThreshold = 0.5;
    
    // Calculate inertia effect
    const inertiaDistance = velocity * inertiaDuration * 1000;
    const totalOffset = dragOffset + inertiaDistance;
    
    let targetIndex = currentIndex;
    
    if (Math.abs(totalOffset) > threshold || Math.abs(velocity) > velocityThreshold) {
      if (totalOffset > 0) {
        targetIndex = currentIndex - Math.ceil(Math.abs(totalOffset) / slideWithGap);
      } else {
        targetIndex = currentIndex + Math.ceil(Math.abs(totalOffset) / slideWithGap);
      }
    }
    
    setDragOffset(0);
    goToSlide(targetIndex);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Get dot index (relative to original items)
  const getDotIndex = () => {
    if (items.length === 0) return 0;
    return currentIndex % items.length;
  };

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Main carousel container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '300px',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={sliderRef}
          style={{
            display: 'flex',
            height: '100%',
            transform: `translateX(${getSlidePosition(currentIndex)}px)`,
            transition: isDragging ? 'none' : isTransitioning ? 'transform 0.3s ease-out' : 'none',
            gap: `${gap}px`
          }}
        >
          {duplicatedItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              style={{
                flexShrink: 0,
                width: `${slideWidth}px`,
                height: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#333',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {item.content}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {showArrows && (
        <>
          <button
            onClick={prevSlide}
            disabled={isTransitioning}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#333',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              opacity: isTransitioning ? 0.5 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            ←
          </button>
          <button
            onClick={nextSlide}
            disabled={isTransitioning}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: '#333',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              opacity: isTransitioning ? 0.5 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            →
          </button>
        </>
      )}

      {/* Dots navigation */}
      {showDots && items.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: '20px'
          }}
        >
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                const setsCount = duplicatedItems.length / items.length;
                const middleSet = Math.floor(setsCount / 2);
                const targetIndex = middleSet * items.length + index;
                goToSlide(targetIndex);
              }}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: getDotIndex() === index ? '#fff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
