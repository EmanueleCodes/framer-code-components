import { useWebHaptics } from "./Sub/Bundle.tsx";
import { addPropertyControls, ControlType, RenderTarget } from "framer";
import { useEffect, useRef, useCallback } from "react";
import { HapticsPreset, PRESET_TRIGGERS } from "./Sub/Presets.tsx";
 
export interface CustomHapticStep {
  duration: number;
  intensity: number;
  delay: number;
}
 
interface HapticsFramerProps {
  type: "preset" | "custom";
  preset: HapticsPreset;
  customPatternType: "No-code" | "Code";
  customPattern: CustomHapticStep[];
  customPatternCode: string;
  debug?: boolean;
}
 
/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 * @framerDisableUnlink
 */
export default function HapticsFramer(props: HapticsFramerProps) {
  const { trigger } = useWebHaptics({ debug: props.debug ?? false });
  const mainRef = useRef<HTMLDivElement>(null);
  const isOnFramerCanvas = RenderTarget.hasRestrictions();
 
  const initializeParent = useCallback(() => {
    if (!mainRef.current || isOnFramerCanvas) return;
 
    const subparent = mainRef.current.parentElement;
    if (!subparent) return;
 
    const parent = subparent.parentElement;
    if (!parent) return;
 
    const handleTouchStart = () => {
      if (props.type === "preset") {
        const { pattern, options } = PRESET_TRIGGERS[props.preset];
        trigger(pattern, options);
        return;
      }
 
      // Custom: Code mode - parse customPatternCode
      if (
        props.customPatternType === "Code" &&
        props.customPatternCode?.trim()
      ) {
        const parsed = parseCustomPatternCode(props.customPatternCode);
        if (parsed?.pattern?.length) {
          const pattern = parsed.pattern.map((step) => ({
            duration: step.duration,
            intensity: step.intensity,
            delay: step.delay,
          }));
          trigger(pattern, parsed.options);
          return;
        }
      }
 
      // Custom: No-code mode - use customPattern array
      if (props.customPattern?.length > 0) {
        const pattern = props.customPattern.map((step) => ({
          duration: step.duration,
          intensity: step.intensity,
          delay: step.delay,
        }));
        trigger(pattern);
      }
    };
 
    parent.addEventListener("click", handleTouchStart, { capture: true });
    return () => {
      parent.removeEventListener("click", handleTouchStart, { capture: true });
    };
  }, [
    trigger,
    props.type,
    props.preset,
    props.customPattern,
    props.customPatternType,
    props.customPatternCode,
    isOnFramerCanvas,
  ]);
 
  useEffect(() => {
    const cleanup = initializeParent();
    return cleanup;
  }, [initializeParent]);
 
  return (
    <div
      ref={mainRef}
      style={{
        width: "0px",
        height: "0px",
      }}
      aria-hidden
    />
  );
}
 
interface ParsedCustomPattern {
  pattern: CustomHapticStep[];
  options?: { intensity?: number };
}
 
/**
 * Parses customPatternCode string (e.g. from Web Haptics) and extracts the
 * array from trigger([...]) and optional options trigger([...], { intensity }).
 * Returns null if parsing fails.
 */
function parseCustomPatternCode(code: string): ParsedCustomPattern | null {
  if (!code?.trim()) return null;
 
  // Match trigger([...]) or trigger([...], { ... }) - use non-greedy to stop at first ]
  const match = code.match(
    /trigger\s*\(\s*\[([\s\S]*?)\]\s*(?:,\s*(\{[^}]*\}))?\s*\)/,
  );
  if (!match) return null;
 
  const arrayContent = match[1].trim();
  if (!arrayContent) return null;
 
  const steps: CustomHapticStep[] = [];
  const objectRegex = /\{\s*([^}]*)\s*\}/g;
  let objectMatch;
 
  while ((objectMatch = objectRegex.exec(arrayContent)) !== null) {
    const innerContent = objectMatch[1];
    const step: CustomHapticStep = { duration: 30, intensity: 0.7, delay: 0 };
 
    const pairs = innerContent.split(",");
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(":");
      if (colonIndex === -1) continue;
      const key = pair.slice(0, colonIndex).trim();
      const valueStr = pair.slice(colonIndex + 1).trim();
      const value = parseFloat(valueStr);
      if (key === "duration" && !isNaN(value)) step.duration = value;
      else if (key === "intensity" && !isNaN(value)) step.intensity = value;
      else if (key === "delay" && !isNaN(value)) step.delay = value;
    }
 
    steps.push(step);
  }
 
  if (steps.length === 0) return null;
 
  const result: ParsedCustomPattern = { pattern: steps };
 
  // Parse optional second argument: { intensity: 0.9 }
  const optionsStr = match[2];
  if (optionsStr) {
    const optionsMatch = optionsStr.match(/intensity\s*:\s*([\d.]+)/);
    if (optionsMatch) {
      const intensity = parseFloat(optionsMatch[1]);
      if (!isNaN(intensity)) result.options = { intensity };
    }
  }
 
  return result;
}
 
addPropertyControls(HapticsFramer, {
  type: {
    type: ControlType.Enum,
    title: "Config",
    options: ["preset", "custom"],
    optionTitles: ["Preset", "Custom"],
    defaultValue: "preset",
    displaySegmentedControl: true,
  },
  preset: {
    type: ControlType.Enum,
    title: "Preset",
    options: [
      "success",
      "warning",
      "error",
      "light",
      "medium",
      "heavy",
      "soft",
      "rigid",
      "selection",
      "nudge",
      "strong",
      "buzz",
    ],
    optionTitles: [
      "Success",
      "Warning",
      "Error",
      "Light",
      "Medium",
      "Heavy",
      "Soft",
      "Rigid",
      "Selection",
      "Nudge",
      "Strong",
      "Buzz",
    ],
    defaultValue: "success",
    hidden: (props: HapticsFramerProps) => props.type !== "preset",
  },
  customPatternType: {
    type: ControlType.Enum,
    title: " ",
    options: ["No-code", "Code"],
    optionTitles: ["No-code", "Code"],
    defaultValue: "No-code",
    displaySegmentedControl: true,
    hidden: (props: HapticsFramerProps) => props.type !== "custom",
  },
  customPattern: {
    type: ControlType.Array,
    title: "Pattern",
    control: {
      type: ControlType.Object,
      title: "Step",
      controls: {
        duration: {
          type: ControlType.Number,
          title: "Duration (ms)",
          min: 0,
          max: 1000,
          step: 1,
          defaultValue: 30,
        },
        intensity: {
          type: ControlType.Number,
          title: "Intensity",
          min: 0,
          max: 1,
          step: 0.1,
          defaultValue: 0.7,
        },
        delay: {
          type: ControlType.Number,
          title: "Delay (ms)",
          min: 0,
          max: 500,
          step: 1,
          defaultValue: 0,
        },
      },
    },
    defaultValue: [{ duration: 30, intensity: 0.7, delay: 0 }],
    hidden: (props: HapticsFramerProps) =>
      props.type !== "custom" || props.customPatternType !== "No-code",
  },
  customPatternCode: {
    type: ControlType.String,
    title: "Code Pattern",
    defaultValue: "",
    placeholder:
      "trigger([\n{ duration: 40 },\n{ delay: 40, duration: 40 },\n], { intensity: 0.9 })",
    displayTextArea: true,
    hidden: (props: HapticsFramerProps) =>
      props.type !== "custom" || props.customPatternType !== "Code",
    description:
      "Copy code block from [Web Haptics](https://haptics.lochie.me/) to use here.",
  },
  debug: {
    type: ControlType.Boolean,
    title: "Play Sound",
    defaultValue: false,
    description:
      "For development purposes only. Will a play sound on desktop.\n\nMore components at [Framer Coder](https://framercoder.com).",
  },
});
 
HapticsFramer.displayName = "Haptics for Framer";