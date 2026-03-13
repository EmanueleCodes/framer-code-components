import { useWebHaptics } from "web-haptics/react";

export type HapticsPreset =
  | "success"
  | "warning"
  | "error"
  | "light"
  | "medium"
  | "heavy"
  | "soft"
  | "rigid"
  | "selection"
  | "nudge"
  | "strong"
  | "buzz";

export const PRESET_TRIGGERS: Record<
  HapticsPreset,
  {
    pattern: Parameters<ReturnType<typeof useWebHaptics>["trigger"]>[0];
    options?: Parameters<ReturnType<typeof useWebHaptics>["trigger"]>[1];
  }
> = {
  success: {
    pattern: [{ duration: 30 }, { delay: 60, duration: 40, intensity: 1 }],
  },
  warning: {
    pattern: [
      { duration: 40, intensity: 0.8 },
      { delay: 100, duration: 40, intensity: 0.6 },
    ],
  },
  error: {
    pattern: [
      { duration: 40 },
      { delay: 40, duration: 40 },
      { delay: 40, duration: 40 },
    ],
    options: { intensity: 0.9 },
  },
  light: {
    pattern: [{ duration: 15 }],
    options: { intensity: 0.4 },
  },
  medium: {
    pattern: [{ duration: 25 }],
    options: { intensity: 0.7 },
  },
  heavy: {
    pattern: [{ duration: 35 }],
    options: { intensity: 1 },
  },
  soft: {
    pattern: [{ duration: 40 }],
  },
  rigid: {
    pattern: [{ duration: 10 }],
    options: { intensity: 1 },
  },
  selection: {
    pattern: [{ duration: 8 }],
    options: { intensity: 0.3 },
  },
  nudge: {
    pattern: [
      { duration: 80, intensity: 0.8 },
      { delay: 80, duration: 50, intensity: 0.3 },
    ],
  },
  strong: {
    pattern: [{ duration: 1000 }],
    options: { intensity: 1 },
  },
  buzz: {
    pattern: [{ duration: 1000 }],
    options: { intensity: 1 },
  },
};
