/**
 * @file EnvironmentDetector.ts
 * @description Environment Detection Utility for FAME
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Utility for detecting Framer environments (Canvas, Preview, Production).
 * Helps animations behave appropriately in different contexts.
 * 
 * @example
 * ```typescript
 * import { EnvironmentDetector } from './EnvironmentDetector.ts';
 * 
 * if (EnvironmentDetector.isCanvas()) {
 *     // Handle Canvas mode
 * }
 * ```
 */

import { logger } from './Logger.ts';

/**
 * Enum representing the different Framer environments
 */
export enum FramerEnvironment {
    CANVAS = "canvas",
    PREVIEW = "preview",
    PRODUCTION = "production",
}

/**
 * Utility class for detecting and managing Framer environments
 */
export class EnvironmentDetector {
    private static environment: FramerEnvironment | null = null;

    /**
     * Detect the current Framer environment
     */
    static detect(): FramerEnvironment {
        // Return cached value if already detected
        if (this.environment) {
            return this.environment;
        }

        try {
            // Try to use Framer's RenderTarget API if available
            // This is the most reliable method
            //@ts-ignore
            if (typeof window !== "undefined" && window["Framer"]) {
                //@ts-ignore
                const framer = window["Framer"];

                // ✅ Path 1 – RenderTarget is available and reliable
                if (framer.RenderTarget && typeof framer.RenderTarget.current === "function") {
                    const target = framer.RenderTarget.current();

                    if (target === framer.RenderTarget.canvas) {
                        this.environment = FramerEnvironment.CANVAS;
                    } else if (target === framer.RenderTarget.preview) {
                        this.environment = FramerEnvironment.PREVIEW;
                    } else {
                        this.environment = FramerEnvironment.PRODUCTION;
                    }

                    logger.debug(
                        "EnvironmentDetector",
                        `Detected Framer environment: ${this.environment}`
                    );
                    return this.environment;
                }

                // 🟠 Path 1b – Framer object exists but RenderTarget is NOT ready yet.
                // This happens on hard-refresh in production when our code executes before Framer
                // initialises its runtime. Treat this as PRODUCTION for now **without caching** so
                // that a later call, after Framer booted, can still overwrite it with the exact value.
                return FramerEnvironment.PRODUCTION;
            }

            // Fallback detection using URL and DOM
            if (typeof window !== "undefined") {
                const href = window.location.href;

                if (href.includes("framercanvas")) {
                    this.environment = FramerEnvironment.CANVAS;
                } else if (href.includes("framerpreview")) {
                    this.environment = FramerEnvironment.PREVIEW;
                } else {
                    this.environment = FramerEnvironment.PRODUCTION;
                }

                logger.debug(
                    "EnvironmentDetector",
                    `Detected Framer environment via fallback: ${this.environment}`
                );

                return this.environment;
            }

            // Default to PRODUCTION in case of SSR or other edge cases
            this.environment = FramerEnvironment.PRODUCTION;
            return this.environment;
        } catch (error) {
            logger.warn(
                "EnvironmentDetector",
                "Error detecting environment, defaulting to PRODUCTION",
                error
            );
            this.environment = FramerEnvironment.PRODUCTION;
            return this.environment;
        }
    }

    /**
     * Check if current environment is Framer Canvas
     */
    static isCanvas(): boolean {
        return this.detect() === FramerEnvironment.CANVAS;
    }

    /**
     * Check if current environment is Framer Preview
     */
    static isPreview(): boolean {
        return this.detect() === FramerEnvironment.PREVIEW;
    }

    /**
     * Check if current environment is Production (published site)
     */
    static isProduction(): boolean {
        return this.detect() === FramerEnvironment.PRODUCTION;
    }

    /**
     * Should initial animation values be applied?
     * In Canvas mode, we don't want to apply FROM values
     */
    static shouldApplyInitialAnimation(): boolean {
        return this.detect() !== FramerEnvironment.CANVAS;
    }

    /**
     * Should we run animations in this environment?
     * In Canvas mode, we don't want animations to run
     */
    static shouldRunAnimations(): boolean {
        return this.detect() !== FramerEnvironment.CANVAS;
    }

    /**
     * Force environment (for testing)
     */
    static forceEnvironment(env: FramerEnvironment): void {
        this.environment = env;
        logger.debug("EnvironmentDetector", `Environment forced to: ${env}`);
    }

    /**
     * Reset cached environment
     */
    static reset(): void {
        this.environment = null;
    }
} 