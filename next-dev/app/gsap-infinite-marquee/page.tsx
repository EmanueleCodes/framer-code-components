"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Register GSAP plugins
gsap.registerPlugin(useGSAP);

export default function InfiniteMarqueePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sample data for the marquee items
  const items = Array.from({ length: 4 }, (_, i) => ({
    id: i + 1,
    content: `Item ${i + 1}`,
    style: i === 4 ? { width: "350px" } : {}
  }));

  useGSAP(() => {
    if (!wrapperRef.current) return;

    const wrapper = wrapperRef.current.querySelector('.flex') as HTMLElement;
    if (!wrapper) return;

    // Calculate width of one complete set (half of total since we duplicated)
    const boxes = gsap.utils.toArray(".box") as HTMLElement[];
    let oneSetWidth = 0;
    
    // Calculate width of first set only (original items)
    for (let i = 0; i < items.length; i++) {
      oneSetWidth += boxes[i].offsetWidth + 10; // +10 for margin-right
    }

    // Animate the flex container
    gsap.to(wrapper, {
      x: -oneSetWidth,
      duration: 10,
      repeat: -1,
      ease: "none"
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Simple Horizontal Loop
      </h1>
      
      {/* Marquee Container */}
      <div 
        ref={wrapperRef}
        className="wrapper relative h-32 overflow-hidden bg-white rounded-lg shadow-lg"
      >
        <div className="flex">
          {/* First set of items */}
          {items.map((item) => (
            <div
              key={item.id}
              className="box flex items-center justify-center bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold text-2xl flex-shrink-0"
              style={{
                width: item.style.width || "200px",
                height: "100px",
                borderRadius: "8px",
                marginRight: "10px",
                ...item.style
              }}
            >
              <div className="box__inner">
                <p>{item.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center text-gray-600">
        <p>Simple horizontal infinite loop animation</p>
      </div>
    </div>
  );
}
