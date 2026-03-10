/**
 * WebHaptics bundle for Framer.
 * Exports useWebHaptics, WebHaptics, and PRESET_TRIGGERS for the Haptics component.
 * See https://haptics.lochie.me/ and https://github.com/lochie/web-haptics
 */
export { WebHaptics } from "web-haptics";
export { useWebHaptics } from "web-haptics/react";

/** Preset names supported by trigger(pattern, options). "strong" is mapped to "heavy" in PRESET_TRIGGERS. */
const PRESET_NAMES = [
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
];

/**
 * Maps each preset name to { pattern, options? } for trigger(pattern, options).
 * "strong" uses the same pattern as "heavy" (library has no "strong" preset).
 */
export const PRESET_TRIGGERS = Object.fromEntries(
  PRESET_NAMES.map((name) => [
    name,
    { pattern: name === "strong" ? "heavy" : name },
  ])
);
