/**
 * @file Logger.ts
 * @description Simplified logging utility for FAME
 * 
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * Simple logger that can be used throughout FAME
 */
export const logger = {
    debug: (context: string, message: string, ...args: any[]) => {
        console.debug(`[DEBUG] [${context}] ${message}`, ...args);
    },
    
    info: (context: string, message: string, ...args: any[]) => {
        console.info(`[INFO] [${context}] ${message}`, ...args);
    },
    
    warn: (context: string, message: string, ...args: any[]) => {
        console.warn(`[WARN] [${context}] ${message}`, ...args);
    },
    
    error: (context: string, message: string, ...args: any[]) => {
        console.error(`[ERROR] [${context}] ${message}`, ...args);
    }
}; 