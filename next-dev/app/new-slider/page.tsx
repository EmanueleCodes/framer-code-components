"use client";

import React from 'react';
import { InfiniteCarousel } from './new-carousel';

const Page = () => {
  // Sample data for different carousel demonstrations
  const colorSlides = [
    { id: 1, content: <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>Slide 1</div> },
    { id: 2, content: <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>Slide 2</div> },
    { id: 3, content: <div style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>Slide 3</div> },
    { id: 4, content: <div style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>Slide 4</div> },
    { id: 5, content: <div style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>Slide 5</div> }
  ];

  const productSlides = [
    { 
      id: 'product1', 
      content: (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#fff', border: '2px solid #eee' }}>
          <div style={{ width: '100%', height: '60%', backgroundColor: '#f8f9fa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '48px' }}>📱</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>iPhone 15 Pro</h3>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>From $999</p>
          </div>
        </div>
      )
    },
    { 
      id: 'product2', 
      content: (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#fff', border: '2px solid #eee' }}>
          <div style={{ width: '100%', height: '60%', backgroundColor: '#f8f9fa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '48px' }}>💻</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>MacBook Pro</h3>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>From $1,999</p>
          </div>
        </div>
      )
    },
    { 
      id: 'product3', 
      content: (
        <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#fff', border: '2px solid #eee' }}>
          <div style={{ width: '100%', height: '60%', backgroundColor: '#f8f9fa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '48px' }}>⌚</span>
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>Apple Watch</h3>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>From $399</p>
          </div>
        </div>
      )
    }
  ];

  const singleSlide = [
    { 
      id: 'single', 
      content: (
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white', 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          padding: '20px'
        }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>Single Slide Demo</h2>
          <p style={{ margin: '0', fontSize: '16px', opacity: 0.9 }}>This demonstrates auto-duplication for infinite scroll</p>
        </div>
      )
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f7fa', 
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: 'bold', 
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Infinite Carousel Demo
          </h1>
          <p style={{ fontSize: '20px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
            A fully-featured infinite carousel with arrow navigation, dot indicators, drag support with inertia, and intelligent content duplication.
          </p>
        </div>

        {/* Demo Section 1: Standard Carousel */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
            🎨 Standard Carousel (5 slides)
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px', lineHeight: '1.6' }}>
            A beautiful carousel with gradient backgrounds. Try dragging the slides, using the arrows, or clicking the dots below!
          </p>
          <InfiniteCarousel
            items={colorSlides}
            slideWidth={280}
            gap={24}
            showArrows={true}
            showDots={true}
            dragSensitivity={0.6}
            inertiaDuration={0.5}
          />
        </div>

        {/* Demo Section 2: Product Carousel */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
            🛍️ Product Showcase (3 slides)
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px', lineHeight: '1.6' }}>
            Perfect for e-commerce product displays. Notice how the carousel intelligently duplicates content to ensure smooth infinite scrolling.
          </p>
          <InfiniteCarousel
            items={productSlides}
            slideWidth={240}
            gap={20}
            showArrows={true}
            showDots={true}
            dragSensitivity={0.7}
            inertiaDuration={0.4}
          />
        </div>

        {/* Demo Section 3: Single Slide */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
            🔄 Single Slide Auto-Duplication
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px', lineHeight: '1.6' }}>
            Even with just one slide, the carousel creates duplicates automatically to fill the container width and enable infinite scrolling!
          </p>
          <InfiniteCarousel
            items={singleSlide}
            slideWidth={320}
            gap={32}
            showArrows={true}
            showDots={true}
            dragSensitivity={0.5}
            inertiaDuration={0.6}
          />
        </div>

        {/* Demo Section 4: Auto-play Carousel */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
            ⏯️ Auto-Play Carousel
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px', lineHeight: '1.6' }}>
            This carousel automatically advances every 2 seconds. Auto-play pauses when you interact with the carousel.
          </p>
          <InfiniteCarousel
            items={colorSlides}
            slideWidth={200}
            gap={16}
            autoPlay={true}
            autoPlayDelay={2000}
            showArrows={true}
            showDots={true}
            dragSensitivity={0.5}
            inertiaDuration={0.6}
          />
        </div>

        {/* Demo Section 5: Minimal Carousel */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
            ✨ Minimal Design (Drag only)
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px', lineHeight: '1.6' }}>
            Clean and minimal - no arrows or dots, just pure drag interaction with smooth inertia.
          </p>
          <InfiniteCarousel
            items={productSlides}
            slideWidth={300}
            gap={40}
            showArrows={false}
            showDots={false}
            dragSensitivity={0.8}
            inertiaDuration={0.8}
          />
        </div>

        {/* Features List */}
        <div style={{ 
          backgroundColor: 'white', 
          padding: '40px', 
          borderRadius: '16px', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          marginBottom: '40px'
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: '#333', textAlign: 'center' }}>
            🚀 Features
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px' 
          }}>
            <div style={{ padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '2px solid #e9ecef' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>🔄 Infinite Scrolling</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0', lineHeight: '1.5' }}>Seamless infinite loop with intelligent content duplication</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '2px solid #e9ecef' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>🖱️ Drag & Inertia</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0', lineHeight: '1.5' }}>Smooth dragging with realistic physics-based inertia</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '2px solid #e9ecef' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>🎯 Smart Duplication</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0', lineHeight: '1.5' }}>Automatically calculates and creates enough slides to fill container</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '2px solid #e9ecef' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>📱 Touch Support</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0', lineHeight: '1.5' }}>Full touch and mobile support with gesture recognition</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '2px solid #e9ecef' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>⚡ Performance</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0', lineHeight: '1.5' }}>Optimized rendering with minimal re-renders and smooth 60fps</p>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '2px solid #e9ecef' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>🎨 Customizable</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0', lineHeight: '1.5' }}>Fully customizable slides, arrows, dots, and animations</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: '16px', color: '#666', margin: '0' }}>
            Built with React, TypeScript, and modern web standards 🚀
          </p>
        </div>
      </div>
    </div>
  );
};

export default Page;
