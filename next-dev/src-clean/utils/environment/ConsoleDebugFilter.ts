/**
 * @file ConsoleDebugFilter.ts
 * @description Runtime console filtering so that verbose logs only appear when the FAME debug system is enabled.
 *
 * @version 1.0.0
 * @since 1.0.0
 *
 * Usage:
 * ```typescript
 * import { setDebugLogging } from "../utils/environment/ConsoleDebugFilter.ts";
 * setDebugLogging(true);  // enable logs
 * setDebugLogging(false); // silence console.log/info/debug
 * ```
 */

// -----------------------------
//  INTERNAL STATE & PATCHING
// -----------------------------

type ConsoleMethod = (...args: any[]) => void;

interface FameConsole extends Console {
    __fameDebugPatched?: boolean;
    __fameDebugEnabled?: boolean;
    __fameOriginalLog?: ConsoleMethod;
    __fameOriginalInfo?: ConsoleMethod;
    __fameOriginalDebug?: ConsoleMethod;
}

const globalConsole = console as FameConsole;

// Patch the console methods only once to avoid stacking wrappers.
if (!globalConsole.__fameDebugPatched) {
    globalConsole.__fameOriginalLog = globalConsole.log.bind(globalConsole);
    globalConsole.__fameOriginalInfo = globalConsole.info.bind(globalConsole);
    globalConsole.__fameOriginalDebug = globalConsole.debug.bind(globalConsole);

    const createFiltered = (original: ConsoleMethod): ConsoleMethod => {
        return (...args: any[]) => {
            // ✅ NORMAL FILTERING: Restore original debug-based filtering
            if (globalConsole.__fameDebugEnabled) {
                original(...args);
            }
            
            // 🚨 DEBUGGING CODE (commented out - was used for debugging)
            // original(...args);
        };
    };

    globalConsole.log = createFiltered(globalConsole.__fameOriginalLog);
    globalConsole.info = createFiltered(globalConsole.__fameOriginalInfo);
    globalConsole.debug = createFiltered(globalConsole.__fameOriginalDebug);

    // Default to enabled in development; will be toggled by FAME components.
    globalConsole.__fameDebugEnabled = true;
    globalConsole.__fameDebugPatched = true;
}

// -----------------------------
//  PUBLIC API
// -----------------------------

/**
 * Enable or disable debug-level console output at runtime.
 * Error and warning logs are always shown.
 *
 * @param enabled When false, console.log/info/debug become no-ops.
 */
export function setDebugLogging(enabled: boolean): void {
    (console as FameConsole).__fameDebugEnabled = enabled;
} 