/**
 * ASCII style presets — ported from `AsciiEffect.tsx` fragment shader (`getChar`).
 * See: next-dev/app/ASCII-Media/AsciiEffect.tsx (styles 0..7).
 */

export type AsciiStyleId =
    | "standard"
    | "dense"
    | "minimal"
    | "blocks"
    | "braille"
    | "technical"
    | "matrix"
    | "hatching"

/** Style 0 shader comment: "Classic ASCII with . : - = + * # @" */
export const STANDARD_GLYPH_ORDER = ".:-=+*#@"

/** Style 3: shade tiles for canvas */
export const BLOCK_GLYPH_ORDER = "\u2591\u2592\u2593\u2588"

const PROCEDURAL_GLYPH_ORDER = STANDARD_GLYPH_ORDER

function fract(n: number): number {
    return n - Math.floor(n)
}

function mod2(x: number): number {
    return x - Math.floor(x / 2) * 2
}

export function asciiStyleToIndex(style: AsciiStyleId): number {
    const m: Record<AsciiStyleId, number> = {
        standard: 0,
        dense: 1,
        minimal: 2,
        blocks: 3,
        braille: 4,
        technical: 5,
        matrix: 6,
        hatching: 7,
    }
    return m[style] ?? 0
}

/** Port of `getChar` from AsciiEffect.tsx */
export function getCharMask(
    brightness: number,
    lx: number,
    ly: number,
    style: number,
    time: number
): number {
    const gx = Math.floor(lx * 4)
    const gy = Math.floor(ly * 4)

    if (style === 0) {
        if (brightness < 0.1) return 0
        if (brightness < 0.2) return gx === 1 && gy === 1 ? 0.4 : 0
        if (brightness < 0.3)
            return gx >= 1 && gx <= 2 && (gy === 1 || gy === 2) ? 0.6 : 0
        if (brightness < 0.45) return gy === 1 || gy === 2 ? 0.7 : 0
        if (brightness < 0.55) {
            const rowMid = gy === 1 || gy === 2
            const colMid = gx === 1 && (gy === 1 || gy === 2)
            return rowMid || colMid ? 0.8 : 0
        }
        if (brightness < 0.7) return (gx + gy) % 2 === 0 ? 0.85 : 0.3
        if (brightness < 0.85)
            return gx === 0 || gx === 3 || gy === 0 || gy === 3 ? 1.0 : 0.5
        return 1.0
    }

    if (style === 1) {
        if (brightness < 0.15) return 0
        if (brightness < 0.25) return gx === 1 && gy === 1 ? 0.5 : 0
        if (brightness < 0.4)
            return (gx === 1 || gx === 2) && (gy === 1 || gy === 2) ? 0.7 : 0
        if (brightness < 0.55) return gy >= 1 && gy <= 2 ? 0.8 : 0.15
        if (brightness < 0.7) return (gx + gy) % 2 === 0 ? 0.9 : 0.4
        if (brightness < 0.85) return 0.85
        return 1.0
    }

    if (style === 2) {
        if (brightness < 0.25) return 0
        if (brightness < 0.45) return gx === 1 && gy === 1 ? 0.6 : 0
        if (brightness < 0.65) return gy === 1 || gy === 2 ? 0.8 : 0
        if (brightness < 0.85)
            return (gx === 0 || gx === 3) && (gy === 1 || gy === 2)
                ? 1.0
                : gy === 1 || gy === 2
                  ? 0.8
                  : 0
        return 1.0
    }

    if (style === 3) {
        const blockBrightness = brightness >= 0.1 ? 1 : 0
        if (brightness < 0.25)
            return gx % 3 === 0 && gy % 3 === 0 ? 0.5 * blockBrightness : 0
        if (brightness < 0.5)
            return (gx + gy) % 2 === 0
                ? 0.7 * blockBrightness
                : 0.2 * blockBrightness
        if (brightness < 0.75) return 0.8
        return 1.0
    }

    if (style === 4) {
        const dotGridx = Math.floor(lx * 8)
        const dotGridy = Math.floor(ly * 8)
        const dotX = dotGridx % 2
        const dotY = dotGridy % 4
        const isDotPos =
            dotX < 1 &&
            (dotY === 0 || dotY === 1 || dotY === 2 || dotY === 3)
        if (brightness < 0.15) return 0
        if (brightness < 0.3)
            return isDotPos && (dotY === 1 || dotY === 2) ? 0.6 : 0
        if (brightness < 0.5)
            return isDotPos && dotY >= 1 && dotY <= 2 ? 0.8 : 0
        if (brightness < 0.7) return isDotPos ? 0.9 : 0
        if (brightness < 0.85) return isDotPos ? 1.0 : 0.2
        return isDotPos ? 1.0 : 0.4
    }

    if (style === 5) {
        const isEdge = gx === 0 || gx === 3 || gy === 0 || gy === 3
        const isCorner =
            (gx === 0 || gx === 3) && (gy === 0 || gy === 3)
        const isCenter = gx >= 1 && gx <= 2 && gy >= 1 && gy <= 2
        if (brightness < 0.2) return 0
        if (brightness < 0.35) return isCorner ? 0.7 : 0
        if (brightness < 0.5) return isCorner || (gx === 1 && gy === 1) ? 0.8 : 0
        if (brightness < 0.65) return isEdge ? 0.85 : isCenter ? 0.3 : 0
        if (brightness < 0.8) return isEdge ? 1.0 : 0.5
        return 1.0
    }

    if (style === 6) {
        const col = Math.floor(lx * 4)
        const row = Math.floor(ly * 6)
        const seed = fract(
            Math.sin(col * 12.9898 + Math.floor(time * 2)) * 43758.5453
        )
        const charSeed = fract(
            Math.sin((col + row * 4) * 78.233 + seed) * 43758.5453
        )
        const isOn = charSeed < brightness
        if (brightness < 0.15) return 0
        if (brightness < 0.4) return isOn ? 0.5 + charSeed * 0.3 : 0
        if (brightness < 0.7) return isOn ? 0.7 + charSeed * 0.2 : 0.1
        return isOn ? 0.9 + charSeed * 0.1 : 0.3
    }

    if (style === 7) {
        const hatchUVx = lx * 8
        const hatchUVy = ly * 8
        const diag1 = Math.abs(mod2(hatchUVx + hatchUVy) - 1)
        const diag2 = Math.abs(mod2(hatchUVx - hatchUVy) - 1)
        const hLine = Math.abs(mod2(hatchUVy) - 1)
        const vLine = Math.abs(mod2(hatchUVx) - 1)
        if (brightness < 0.15) return 0
        if (brightness < 0.3) return Math.abs(diag1) < 0.15 ? 0.6 : 0
        if (brightness < 0.45)
            return Math.abs(diag1) < 0.2 || Math.abs(diag2) < 0.15 ? 0.7 : 0
        if (brightness < 0.6)
            return Math.abs(diag1) < 0.25 || Math.abs(diag2) < 0.2 ? 0.8 : 0.1
        if (brightness < 0.75)
            return Math.abs(diag1) < 0.3 ||
                Math.abs(diag2) < 0.25 ||
                Math.abs(hLine) < 0.2
                ? 0.9
                : 0.2
        if (brightness < 0.9)
            return Math.abs(diag1) < 0.35 ||
                Math.abs(diag2) < 0.3 ||
                Math.abs(hLine) < 0.25 ||
                Math.abs(vLine) < 0.2
                ? 0.95
                : 0.35
        return 1.0
    }

    return brightness
}

function averageMask(
    brightness: number,
    style: number,
    time: number,
    grid = 4
): number {
    let s = 0
    let n = 0
    for (let i = 0; i < grid; i++) {
        for (let j = 0; j < grid; j++) {
            const lx = (i + 0.5) / grid
            const ly = (j + 0.5) / grid
            s += getCharMask(brightness, lx, ly, style, time)
            n++
        }
    }
    return n > 0 ? s / n : 0
}

function glyphIndexFromMask(mask: number, len: number): number {
    if (len <= 1) return 0
    const x = Math.max(0, Math.min(1, mask))
    return Math.min(len - 1, Math.max(0, Math.round(x * (len - 1))))
}

export function glyphFromAsciiPreset(
    brightness: number,
    style: AsciiStyleId,
    time: number
): string {
    const si = asciiStyleToIndex(style)
    const mask = averageMask(brightness, si, time, 4)

    if (style === "blocks") {
        const chars = BLOCK_GLYPH_ORDER
        const i = glyphIndexFromMask(mask, chars.length)
        return chars[i] ?? "."
    }

    const chars = PROCEDURAL_GLYPH_ORDER
    const i = glyphIndexFromMask(mask, chars.length)
    return chars[i] ?? "."
}
