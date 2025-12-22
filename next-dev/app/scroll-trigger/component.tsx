/**
 * ScrollTrigger Component
 * 
 * A Framer component that uses GSAP ScrollTrigger to create scroll-based animations.
 * Place this component inside any component you want to animate on scroll.
 * 
 * @framerDisableUnlink
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */

import React, { useRef, useEffect, useState } from "react"
import { addPropertyControls, ControlType } from "framer"

// GSAP imports
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"

// ScrollTrigger is already registered in the bundle

gsap.registerPlugin(ScrollTrigger);

interface ScrollTriggerProps {
  // Core ScrollTrigger options
  start: string
  end: string
  scrub: boolean
  pin: boolean
  markers: boolean
  once: boolean

  // Trigger element selection
  triggerType: "self" | "id" | "framerName"
  triggerValue: string

  // Animation target selection
  targetType: "self" | "id" | "framerName"
  targetValue: string

  // Animation properties
  animationType: "fade" | "slide" | "scale" | "keyframes" | "custom"
  customAnimation: string

  // Keyframe animations
  keyframes: Keyframe[]

  // Debug
  debug: boolean

  // Framer props
  style?: React.CSSProperties
}

interface Keyframe {
  // Target element for this keyframe
  targetType: "self" | "id" | "framerName"
  targetValue: string
  
  // Animation properties
  properties: { [key: string]: any }
  
  // Timing and options
  duration: number
  ease: string
  delay: number
  
  // Position in timeline (0-1, where 0 is start, 1 is end)
  position: number
}

export default function ScrollTriggerComponent(props: ScrollTriggerProps) {
  const {
    start,
    end,
    scrub,
    pin,
    markers,
    once,
    triggerType,
    triggerValue,
    targetType,
    targetValue,
    animationType,
    customAnimation,
    keyframes,
    debug,
    style
  } = props

  // Refs
  const componentRef = useRef<HTMLDivElement>(null)
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null)
  
  // State
  const [isActive, setIsActive] = useState(false)

  

  // Helper function to find elements based on type and value
  const findElement = (type: "self" | "id" | "framerName", value: string, isTrigger: boolean = false): HTMLElement | null => {
    if (!componentRef.current) return null

    switch (type) {
      case "self":
        // For trigger: use parent of ScrollTrigger component (level 1)
        // For target: use parent of ScrollTrigger component (level 1)
        return componentRef.current.parentElement

      case "id":
        // Find element by ID
        const elementById = document.getElementById(value)
        if (elementById) {
          return elementById
        } else {
          console.warn(`ScrollTrigger: No element found with ID "${value}"`)
          return null
        }

      case "framerName":
        // Find element by data-framer-name attribute
        const elementByFramerName = document.querySelector(`[data-framer-name="${value}"]`) as HTMLElement
        if (elementByFramerName) {
          return elementByFramerName
        } else {
          console.warn(`ScrollTrigger: No element found with data-framer-name="${value}"`)
          return null
        }

      default:
        return null
    }
  }

  // Initialize ScrollTrigger
  useEffect(() => {
    if (!componentRef.current) return

    // Find trigger element
    const triggerElement = findElement(triggerType, triggerValue, true)
    if (!triggerElement) {
      console.warn("ScrollTrigger: No trigger element found")
      return
    }

    // Find target element (defaults to self if not found)
    let targetElement = findElement(targetType, targetValue, false)
    if (!targetElement) {
      console.warn("ScrollTrigger: No target element found, defaulting to self")
      targetElement = componentRef.current.parentElement
    }

    // Define animation based on type
    let animation: any = null;
    if (animationType === "fade") {
      animation = (gsap as any).fromTo(targetElement, { opacity: 0, y: 50 }, { opacity: 1, y: 0 });
    } else if (animationType === "slide") {
      animation = (gsap as any).fromTo(targetElement, { x: -100, opacity: 0 }, { x: 0, opacity: 1 });
    } else if (animationType === "scale") {
      animation = (gsap as any).fromTo(targetElement, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1 });
    } else if (animationType === "keyframes" && keyframes && keyframes.length > 0) {
      // Create GSAP timeline for keyframe animations
      const timeline = (gsap as any).timeline();
      
      // Sort keyframes by position (0-1)
      const sortedKeyframes = [...keyframes].sort((a, b) => a.position - b.position);
      
      sortedKeyframes.forEach((keyframe, index) => {
        // Find target element for this keyframe
        const keyframeTarget = findElement(keyframe.targetType, keyframe.targetValue, false) || targetElement;
        
        if (keyframeTarget) {
          // Calculate timing based on position
          const timelinePosition = keyframe.position;
          
          // Add animation to timeline
          timeline.to(keyframeTarget, {
            ...keyframe.properties,
            duration: keyframe.duration,
            ease: keyframe.ease,
            delay: keyframe.delay
          }, timelinePosition);
          
          if (debug) {
            console.log(`ScrollTrigger: Added keyframe ${index + 1} at position ${timelinePosition}`, {
              target: keyframeTarget,
              properties: keyframe.properties,
              duration: keyframe.duration,
              ease: keyframe.ease
            });
          }
        } else {
          console.warn(`ScrollTrigger: Could not find target for keyframe ${index + 1}`);
        }
      });
      
      animation = timeline;
      
    } else if (animationType === "custom" && customAnimation) {
      try {
        // Execute custom animation string. 'targetElement' is available in scope.
        // eslint-disable-next-line no-eval
        animation = eval(customAnimation);
      } catch (e) {
        console.error("ScrollTrigger: Error in custom animation:", e);
      }
    }

    // Create ScrollTrigger instance
    scrollTriggerRef.current = ScrollTrigger.create({
      trigger: triggerElement, // Use trigger element for scroll detection
      start: start,
      end: end,
      scrub: scrub,
      pin: pin,
      markers: markers,
      once: once,
      animation: animation, // Link animation to ScrollTrigger
      
      // Lifecycle callbacks
      onEnter: () => {
        setIsActive(true)
        if (debug) console.log("ScrollTrigger: onEnter")
      },
      
      onLeave: () => {
        setIsActive(false)
        if (debug) console.log("ScrollTrigger: onLeave")
      },
      
      onEnterBack: () => {
        setIsActive(true)
        if (debug) console.log("ScrollTrigger: onEnterBack")
      },
      
      onLeaveBack: () => {
        setIsActive(false)
        if (debug) console.log("ScrollTrigger: onLeaveBack")
      }
    })

    // Cleanup function
    return () => {
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill()
        scrollTriggerRef.current = null
      }
      if (animation) {
        animation.kill(); // Kill associated animation
      }
    }
  }, [start, end, scrub, pin, markers, once, triggerType, triggerValue, targetType, targetValue, debug])

  return (
    <div
      ref={componentRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1000,
        ...style
      }}
      data-scroll-trigger="true"
      data-active={isActive}
    >
      {/* Debug info in Canvas mode */}
      {debug && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "rgba(0, 102, 255, 0.9)",
            color: "white",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: "monospace",
            pointerEvents: "none"
          }}
        >
          Active: {isActive ? "Yes" : "No"}
          <br />
          Target: {targetType === "self" ? "self" : `${targetType}: ${targetValue}`}
        </div>
      )}
    </div>
  )
}

// Default props
ScrollTriggerComponent.defaultProps = {
  start: "top bottom",
  end: "bottom top",
  scrub: false,
  pin: false,
  markers: false,
  once: false,
  triggerType: "self" as const,
  triggerValue: "",
  targetType: "self" as const,
  targetValue: "",
  animationType: "fade" as const,
  customAnimation: "",
  keyframes: [],
  debug: false
}

// Property controls
addPropertyControls(ScrollTriggerComponent, {
  // Core ScrollTrigger options
  start: {
    type: ControlType.String,
    title: "Start Trigger",
    description: "When to start (e.g., 'top bottom', 'center center')",
    defaultValue: "top bottom"
  },
  
  end: {
    type: ControlType.String,
    title: "End Trigger", 
    description: "When to end (e.g., 'bottom top', '+=100%')",
    defaultValue: "bottom top"
  },
  
  scrub: {
    type: ControlType.Boolean,
    title: "Scrub",
    description: "Smooth progress following scroll",
    defaultValue: false
  },
  
  pin: {
    type: ControlType.Boolean,
    title: "Pin",
    description: "Pin element during scroll",
    defaultValue: false
  },
  
  markers: {
    type: ControlType.Boolean,
    title: "Show Markers",
    description: "Show scroll trigger markers for debugging",
    defaultValue: false
  },
  
  once: {
    type: ControlType.Boolean,
    title: "Once Only",
    description: "Trigger only once",
    defaultValue: false
  },
  
          // Trigger element selection
        triggerType: {
          type: ControlType.Enum,
          title: "Trigger Type",
          options: ["self", "id", "framerName"],
          optionTitles: ["Self (Parent)", "Element ID", "Framer Name"],
          defaultValue: "self"
        },

        triggerValue: {
          type: ControlType.String,
          title: "Trigger Value",
          description: "ID or Framer name (leave empty if using 'self')",
          defaultValue: "",
          hidden: (props) => props.triggerType === "self"
        },

        // Animation target selection
        targetType: {
          type: ControlType.Enum,
          title: "Target Type",
          options: ["self", "id", "framerName"],
          optionTitles: ["Self (Parent)", "Element ID", "Framer Name"],
          defaultValue: "self"
        },

        targetValue: {
          type: ControlType.String,
          title: "Target Value",
          description: "ID or Framer name (leave empty if using 'self')",
          defaultValue: "",
          hidden: (props) => props.targetType === "self"
        },
  
          // Animation type
        animationType: {
          type: ControlType.Enum,
          title: "Animation Type",
          options: ["fade", "slide", "scale", "keyframes", "custom"],
          optionTitles: ["Fade", "Slide", "Scale", "Keyframes", "Custom"],
          defaultValue: "fade"
        },
  
  customAnimation: {
    type: ControlType.String,
    title: "Custom Animation",
    description: "Custom GSAP animation string or function",
    defaultValue: "",
    hidden: (props) => props.animationType !== "custom"
  },

  // Keyframe animations
  keyframes: {
    type: ControlType.Array,
    title: "Keyframes",
    description: "Array of keyframe animations",
    defaultValue: [],
    hidden: (props) => props.animationType !== "keyframes",
    control: {
      type: ControlType.Object,
      controls: {
        targetType: {
          type: ControlType.Enum,
          title: "Target Type",
          options: ["self", "id", "framerName"],
          optionTitles: ["Self", "ID", "Framer Name"],
          defaultValue: "self"
        },
        targetValue: {
          type: ControlType.String,
          title: "Target Value",
          description: "ID or Framer name (leave empty if using 'self')",
          defaultValue: "",
          hidden: (props) => props.targetType === "self"
        },
        properties: {
          type: ControlType.Object,
          title: "Animation Properties",
          description: "GSAP properties to animate (e.g., opacity, x, y, scale)",
          defaultValue: { opacity: 1, y: 0 },
          controls: {
            opacity: {
              type: ControlType.Number,
              title: "Opacity",
              defaultValue: 1,
              min: 0,
              max: 1,
              step: 0.1
            },
            x: {
              type: ControlType.Number,
              title: "X Position",
              defaultValue: 0
            },
            y: {
              type: ControlType.Number,
              title: "Y Position",
              defaultValue: 0
            },
            scale: {
              type: ControlType.Number,
              title: "Scale",
              defaultValue: 1,
              min: 0.1,
              max: 3,
              step: 0.1
            }
          }
        },
        duration: {
          type: ControlType.Number,
          title: "Duration",
          description: "Animation duration in seconds",
          defaultValue: 1,
          min: 0.1,
          max: 10,
          step: 0.1
        },
        ease: {
          type: ControlType.String,
          title: "Easing",
          description: "GSAP easing function (e.g., 'power2.out', 'back.in')",
          defaultValue: "power2.out"
        },
        delay: {
          type: ControlType.Number,
          title: "Delay",
          description: "Delay before animation starts in seconds",
          defaultValue: 0,
          min: 0,
          max: 5,
          step: 0.1
        },
        position: {
          type: ControlType.Number,
          title: "Position",
          description: "Position in timeline (0 = start, 1 = end)",
          defaultValue: 0,
          min: 0,
          max: 1,
          step: 0.1
        }
      }
    }
  },
  
  // Debug
  debug: {
    type: ControlType.Boolean,
    title: "Debug Mode",
    description: "Show debug info and console logs",
    defaultValue: false
  }
})
