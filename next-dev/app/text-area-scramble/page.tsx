'use client';

import { useEffect, useRef, useState } from "react";

// LIBRARIES WE NEED TO BUNDLE:

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(SplitText, ScrambleTextPlugin, useGSAP);

interface ScrambleTextProps {
  text: string;
  radius?: number;
  duration?: number;
  speed?: number;
  scrambleChars?: string;
  scrambleInterval?: number;
  scramblePercentage?: number; // Percentage of characters to scramble (0-100)
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  scrambleColor?: string;
  font?: React.CSSProperties;
}

const DEFAULT_SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

const ScrambledText = ({
  text,
  radius = 100,
  duration = 1.2,
  speed = 0.5,
  scrambleChars = ".:",
  scrambleInterval = 500,
  scramblePercentage = 100, // Default to 100% (all characters)
  className = "",
  style = {},
  color = "#000000",
  scrambleColor = "#8855FF",
  font = {}
}: ScrambleTextProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<Element[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseOverText, setIsMouseOverText] = useState(false);
  const isMouseOverTextRef = useRef<boolean>(false);
  const currentMousePosRef = useRef({ x: 0, y: 0 });
  const scrambleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentScrambledStates = useRef<Map<Element, string>>(new Map());
  const scrambledCharsRef = useRef<Set<Element>>(new Set()); // Track which chars are actually being scrambled
  const animationFrameRef = useRef<number | null>(null);

  useGSAP(() => {
    if (!rootRef.current) return;

    const paragraph = rootRef.current.querySelector("p");
    if (!paragraph) return;

    const split = SplitText.create(paragraph, {
      type: "chars",
      charsClass: "char",
    });
    charsRef.current = split.chars;

    // Set initial styles for each character
    charsRef.current.forEach((char: Element) => {
      gsap.set(char, {
        display: 'inline-block',
        color: color,
        attr: { 'data-content': char.innerHTML },
      });
      // Initialize scrambled state for each character
      currentScrambledStates.current.set(char, char.innerHTML);
    });

    // Function to generate a random scrambled character
    const getRandomChar = () => {
      return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    };

    // Function to check if mouse is within radius of any character
    const isMouseNearAnyChar = () => {
      if (!rootRef.current) return false;
      
      return charsRef.current.some((char: Element) => {
        const rect = char.getBoundingClientRect();
        const charCenterX = rect.left + rect.width / 2;
        const charCenterY = rect.top + rect.height / 2;
        const dx = currentMousePosRef.current.x - charCenterX;
        const dy = currentMousePosRef.current.y - charCenterY;
        const dist = Math.hypot(dx, dy);
        return dist < radius;
      });
    };

    // Time-based scrambling function that only updates the scrambled states
    const updateScrambledStates = () => {
      if (!isMouseNearAnyChar()) return; // Only scramble when mouse is near any character

      // Get all non-space characters that can be scrambled
      const scrambleableChars = charsRef.current.filter((char: Element) => {
        const originalChar = char.getAttribute('data-content') || "";
        return originalChar.trim() !== ""; // Don't scramble spaces
      });

      // Calculate how many characters to scramble based on percentage
      const charsToScramble = Math.floor((scrambleableChars.length * scramblePercentage) / 100);
      
      // Randomly select characters to scramble
      const shuffledChars = [...scrambleableChars].sort(() => Math.random() - 0.5);
      const charsToUpdate = shuffledChars.slice(0, charsToScramble);

      // Clear previous scrambled characters tracking
      scrambledCharsRef.current.clear();

      // Update only the selected characters
      charsToUpdate.forEach((char: Element) => {
        const scrambledChar = getRandomChar();
        currentScrambledStates.current.set(char, scrambledChar);
        scrambledCharsRef.current.add(char); // Track this character as being scrambled
      });
      
      // Update the display if needed (only for characters currently being scrambled)
      updateCharacterDisplay();
    };

    // Function to update character display based on current mouse position
    const updateCharacterDisplay = () => {
      if (!rootRef.current) return;

      const isNearAnyChar = isMouseNearAnyChar();
      
      charsRef.current.forEach((char: Element) => {
        const rect = char.getBoundingClientRect();
        const charCenterX = rect.left + rect.width / 2;
        const charCenterY = rect.top + rect.height / 2;
        const dx = currentMousePosRef.current.x - charCenterX;
        const dy = currentMousePosRef.current.y - charCenterY;
        const dist = Math.hypot(dx, dy);

        if (dist < radius && isNearAnyChar) {
          // Check if this character is actually being scrambled
          const isBeingScrambled = scrambledCharsRef.current.has(char);
          
          if (isBeingScrambled) {
            // Show the scrambled state and set scramble color
            const scrambledChar = currentScrambledStates.current.get(char) || char.innerHTML;
            gsap.set(char, { 
              innerHTML: scrambledChar,
              color: scrambleColor 
            });
          } else {
            // Show the original character but keep normal color
            const originalChar = char.getAttribute('data-content') || "";
            gsap.set(char, { 
              innerHTML: originalChar,
              color: color 
            });
          }
        } else {
          // Show the original character and restore normal color
          const originalChar = char.getAttribute('data-content') || "";
          gsap.set(char, { 
            innerHTML: originalChar,
            color: color 
          });
        }
      });

      // Update the visual state for the indicator
      setIsMouseOverText(isNearAnyChar);
      isMouseOverTextRef.current = isNearAnyChar;
    };

    // Global mouse move handler using requestAnimationFrame
    const handleGlobalMove = (e: PointerEvent) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        currentMousePosRef.current = { x: e.clientX, y: e.clientY };
        setMousePos({ x: e.clientX, y: e.clientY });
        updateCharacterDisplay();
        
        // Start/stop scrambling based on proximity to characters
        const isNearAnyChar = isMouseNearAnyChar();
        if (isNearAnyChar && !scrambleIntervalRef.current) {
          // Start scrambling interval when mouse gets near any character
          scrambleIntervalRef.current = setInterval(updateScrambledStates, scrambleInterval);
        } else if (!isNearAnyChar && scrambleIntervalRef.current) {
          // Stop scrambling interval when mouse is far from all characters
          clearInterval(scrambleIntervalRef.current);
          scrambleIntervalRef.current = null;
        }
      });
    };

    // Add global mouse move listener
    document.addEventListener("pointermove", handleGlobalMove);

    return () => {
      document.removeEventListener("pointermove", handleGlobalMove);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      split.revert();
      
      // Clear the scrambling interval
      if (scrambleIntervalRef.current) {
        clearInterval(scrambleIntervalRef.current);
      }
      currentScrambledStates.current.clear();
    };
  }, [radius, duration, speed, scrambleChars, scrambleInterval, color, scrambleColor]);

  return (
    <div ref={rootRef} className={`text-block ${className}`} style={{ ...font, ...style }}>
      <p style={{ margin: 0 }}>{text}</p>
      
      {/* Visual indicator circle around cursor - only show when mouse is over text */}
      {isMouseOverText && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x - radius,
            top: mousePos.y - radius,
            width: radius * 2,
            height: radius * 2,
            border: '1px solid rgba(136, 85, 255, 0.3)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 9999,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
    </div>
  );
};

// Clean demo component with predetermined values
const ScrambleDemo = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '8rem'
    }}>
      {/* Large heading demo - 100% scramble */}
      <ScrambledText
        text="Hover over this text to see the scramble effect"
        radius={120}
        scrambleChars="!@#$%^&*()_+-={}[]|;:,.<>?"
        scrambleInterval={300}
        scramblePercentage={100}
        color="#ffffff"
        scrambleColor="#ff6b6b"
        font={{
          fontSize: '4rem',
          fontWeight: '800',
          lineHeight: '1.1',
          textAlign: 'center',
          maxWidth: '900px',
          letterSpacing: '-0.02em'
        }}
      />
      
      {/* Subtitle - 30% scramble for subtle effect */}
      <ScrambledText
        text="Move your cursor around different parts of this text to see how the characters react within the radius area. Only 30% of characters scramble for a subtle effect."
        radius={80}
        scrambleChars=".:"
        scrambleInterval={500}
        scramblePercentage={30}
        color="#888888"
        scrambleColor="#8855ff"
        font={{
          fontSize: '1.5rem',
          lineHeight: '1.4',
          textAlign: 'center',
          maxWidth: '700px',
          fontWeight: '300'
        }}
      />

      {/* Code-style demo - 60% scramble */}
      <ScrambledText
        text="const scrambleEffect = useGSAP(() => { /* Interactive magic happens here */ });"
        radius={100}
        scrambleChars={DEFAULT_SCRAMBLE_CHARS}
        scrambleInterval={500}
        scramblePercentage={90}
        color="#f5f5f5"
        scrambleColor="#A36EFF"
        font={{
          fontSize: '1.1rem',
          fontFamily: 'Monaco, Consolas, monospace',
          backgroundColor: '#1e1e1e',
          color: '#f5f5f5',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #333'
        }}
      />

      
    </div>
  );
};

export default function Page() {
  return <ScrambleDemo />;
}
