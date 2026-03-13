export interface CustomHapticStep {
  duration: number;
  intensity: number;
  delay: number;
}

export interface ParsedCustomPattern {
  pattern: CustomHapticStep[];
  options?: { intensity?: number };
}

const TRIGGER_PATTERN_REGEX = new RegExp(
  "trigger\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*(?:,\\s*(\\{[^}]*\\}))?\\s*\\)",
);

const OBJECT_REGEX = new RegExp("\\{\\s*([^}]*)\\s*\\}", "g");
const INTENSITY_REGEX = new RegExp("intensity\\s*:\\s*([\\d.]+)");

/**
 * Parses customPatternCode string (e.g. from Web Haptics) and extracts the
 * array from trigger([...]) and optional options trigger([...], { intensity }).
 * Returns null if parsing fails.
 */
export function parseCustomPatternCode(
  code: string,
): ParsedCustomPattern | null {
  if (!code?.trim()) return null;

  const match = code.match(TRIGGER_PATTERN_REGEX);
  if (!match) return null;

  const arrayContent = match[1].trim();
  if (!arrayContent) return null;

  const steps: CustomHapticStep[] = [];
  let objectMatch: RegExpExecArray | null;

  while ((objectMatch = OBJECT_REGEX.exec(arrayContent)) !== null) {
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

  const optionsStr = match[2];
  if (optionsStr) {
    const optionsMatch = optionsStr.match(INTENSITY_REGEX);
    if (optionsMatch) {
      const intensity = parseFloat(optionsMatch[1]);
      if (!isNaN(intensity)) result.options = { intensity };
    }
  }

  return result;
}
