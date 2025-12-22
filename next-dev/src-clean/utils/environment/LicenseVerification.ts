/**
 * @file LicenseVerification.ts
 * @description License verification system for FAME Animation System
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * Handles license verification for FAME with the following strategy:
 * 1. Skip verification entirely in Framer Canvas/Preview modes (design/testing)
 * 2. Instant allowance for free Framer domains (.framer.website, etc.)
 * 3. Cached verification for custom domains to avoid API delays
 * 4. Non-blocking verification - never delays initial style application
 * 5. Graceful fallback behavior for network failures
 * 
 * @architecture
 * - Free domains: Instant approval via domain detection
 * - Custom domains: Background verification with localStorage caching
 * - Fallback: Allow animations on network failure for better UX
 * - Performance: Sub-millisecond checks for cached results
 * 
 * @example
 * ```typescript
 * // Check license status (non-blocking)
 * const licenseManager = LicenseManager.getInstance();
 * const isAuthorized = await licenseManager.checkLicense();
 * 
 * // Get instant free domain status
 * const isFree = licenseManager.isFreeFramerDomain();
 * ```
 */

import { logger } from "./Logger.ts";
import { EnvironmentDetector, FramerEnvironment } from "./EnvironmentDetector.ts";

/**
 * License verification result
 */
export interface LicenseResult {
    /** Whether the domain is authorized to use FAME */
    authorized: boolean;
    /** Whether this is a free Framer domain */
    isFreeFramerDomain: boolean;
    /** Whether the result came from cache */
    fromCache: boolean;
    /** Reason for the result (for debugging) */
    reason: string;
    /** Check duration in milliseconds */
    checkDurationMs: number;
}

/**
 * Cache entry for license verification
 */
interface LicenseCacheEntry {
    authorized: boolean;
    timestamp: number;
    domainHash: string;
}

/**
 * License Manager - Singleton for handling FAME license verification
 * 
 * Key Features:
 * - Instant approval for free Framer domains
 * - 24-hour localStorage caching for custom domains
 * - Non-blocking verification (never delays initial styles)
 * - Graceful fallback on network failures
 * - Sub-millisecond performance for cached results
 */
export class LicenseManager {
    private static instance: LicenseManager | null = null;
    
    // Free Framer domains that get instant approval
    private readonly FREE_FRAMER_DOMAINS = [
        '.framer.website',
        '.framer.app',
        '.framer.ai',
        '.framer.wiki',
        '.framer.media',
        '.framer.photos'
    ];
    
    // Additional authorized domains for development/testing
    private readonly ADDITIONAL_FREE_DOMAINS = [
        'webtales.it'  // TODO: Remove this when LemonSqueezy is set up
    ];
    
    // Cache settings
    private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
    private readonly CACHE_KEY_PREFIX = 'fame_license_';
    
    private constructor() {
        // Initialize singleton
    }
    
    /**
     * Get singleton instance
     */
    public static getInstance(): LicenseManager {
        if (!LicenseManager.instance) {
            LicenseManager.instance = new LicenseManager();
        }
        return LicenseManager.instance;
    }
    
    /**
     * Check if current domain is a free Framer domain (instant approval)
     * This check is synchronous and takes ~0.1ms
     */
    public isFreeFramerDomain(): boolean {
        if (typeof window === 'undefined') {
            return false; // Server-side rendering
        }
        
        const hostname = window.location.hostname.toLowerCase();
        
        // Check free Framer domains
        const isFreeFramer = this.FREE_FRAMER_DOMAINS.some(domain => 
            hostname.includes(domain.toLowerCase())
        );
        
        // Check additional authorized domains
        const isAdditionalFree = this.ADDITIONAL_FREE_DOMAINS.some(domain => 
            hostname === domain.toLowerCase() || hostname.includes(domain.toLowerCase())
        );
        
        return isFreeFramer || isAdditionalFree;
    }
    
    /**
     * Get current domain for verification
     */
    private getCurrentDomain(): string {
        if (typeof window === 'undefined') {
            return 'unknown';
        }
        return window.location.hostname.toLowerCase();
    }
    
    /**
     * Generate SHA-256 hash for domain (for privacy)
     * TODO: Implement when LemonSqueezy license verification is added
     */
    private async hashDomain(domain: string): Promise<string> {
        // TODO: Implement SHA-256 hashing when license verification is added
        // For now, return a placeholder
        return `hash_${domain.replace(/\./g, '_')}`;
    }
    
    /**
     * Check localStorage cache for license verification
     */
    private getCachedLicenseResult(domain: string): LicenseCacheEntry | null {
        try {
            const cacheKey = `${this.CACHE_KEY_PREFIX}${domain}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) {
                return null;
            }
            
            const cacheEntry: LicenseCacheEntry = JSON.parse(cached);
            
            // Check if cache is still valid
            const now = Date.now();
            const isExpired = now - cacheEntry.timestamp > this.CACHE_DURATION_MS;
            
            if (isExpired) {
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            return cacheEntry;
        } catch (error) {
            logger.warn('LicenseManager', 'Failed to read license cache:', error);
            return null;
        }
    }
    
    /**
     * Cache license verification result
     */
    private cacheLicenseResult(domain: string, authorized: boolean, domainHash: string): void {
        try {
            const cacheKey = `${this.CACHE_KEY_PREFIX}${domain}`;
            const cacheEntry: LicenseCacheEntry = {
                authorized,
                timestamp: Date.now(),
                domainHash
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        } catch (error) {
            logger.warn('LicenseManager', 'Failed to cache license result:', error);
        }
    }
    
    /**
     * Verify license with remote service
     * TODO: Implement when LemonSqueezy integration is ready
     */
    private async verifyLicenseRemote(domainHash: string): Promise<boolean> {
        // TODO: Implement remote license verification
        // For now, return false (unauthorized) for custom domains
        
        logger.info('LicenseManager', 'TODO: Remote license verification not implemented yet');
        
        try {
            // Placeholder for future implementation:
            // const response = await fetch('https://cdn.yourservice.com/fame-auth.json');
            // const { authorized } = await response.json();
            // return authorized.includes(domainHash);
            
            // For now, deny custom domains until LemonSqueezy is set up
            return false;
        } catch (error) {
            logger.warn('LicenseManager', 'Remote license verification failed:', error);
            // Graceful fallback: allow animations on network failure
            return true;
        }
    }
    
    /**
     * Main license check method - non-blocking and cached
     * This is the primary method used by FAME to check authorization
     */
    public async checkLicense(): Promise<LicenseResult> {
        const startTime = Date.now();
        const domain = this.getCurrentDomain();
        
        // 0. Skip license verification in Framer Canvas and Preview modes
        const environment = EnvironmentDetector.detect();
        if (environment === FramerEnvironment.CANVAS || environment === FramerEnvironment.PREVIEW) {
            const duration = Date.now() - startTime;
            logger.info('LicenseManager', `License check: Framer ${environment} mode - full access granted in ${duration}ms`);
            
            return {
                authorized: true,
                isFreeFramerDomain: false,
                fromCache: false,
                reason: `Framer ${environment} mode - license verification skipped`,
                checkDurationMs: duration
            };
        }
        
        // 1. Instant approval for free Framer domains (fastest path)
        if (this.isFreeFramerDomain()) {
            const duration = Date.now() - startTime;
            logger.info('LicenseManager', `License check: FREE domain approved in ${duration}ms`);
            
            return {
                authorized: true,
                isFreeFramerDomain: true,
                fromCache: false,
                reason: 'Free Framer domain - instant approval',
                checkDurationMs: duration
            };
        }
        
        // 2. Check cache for custom domains (sub-millisecond for hits)
        const cached = this.getCachedLicenseResult(domain);
        if (cached) {
            const duration = Date.now() - startTime;
            logger.info('LicenseManager', `License check: Custom domain ${cached.authorized ? 'authorized' : 'denied'} from cache in ${duration}ms`);
            
            return {
                authorized: cached.authorized,
                isFreeFramerDomain: false,
                fromCache: true,
                reason: `Cached result: ${cached.authorized ? 'authorized' : 'denied'}`,
                checkDurationMs: duration
            };
        }
        
        // 3. Remote verification for uncached custom domains
        try {
            const domainHash = await this.hashDomain(domain);
            const authorized = await this.verifyLicenseRemote(domainHash);
            
            // Cache the result
            this.cacheLicenseResult(domain, authorized, domainHash);
            
            const duration = Date.now() - startTime;
            logger.info('LicenseManager', `License check: Custom domain ${authorized ? 'authorized' : 'denied'} from remote in ${duration}ms`);
            
            return {
                authorized,
                isFreeFramerDomain: false,
                fromCache: false,
                reason: authorized ? 'Valid license found' : 'No valid license found',
                checkDurationMs: duration
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('LicenseManager', 'License verification failed:', error);
            
            // Graceful fallback: allow animations on verification failure
            return {
                authorized: true,
                isFreeFramerDomain: false,
                fromCache: false,
                reason: 'Verification failed - graceful fallback',
                checkDurationMs: duration
            };
        }
    }
    
    /**
     * Perform license check in background without blocking
     * This is used for preemptive verification
     */
    public checkLicenseBackground(): Promise<LicenseResult> {
        return this.checkLicense().catch(error => {
            logger.warn('LicenseManager', 'Background license check failed:', error);
            return {
                authorized: true, // Graceful fallback
                isFreeFramerDomain: this.isFreeFramerDomain(),
                fromCache: false,
                reason: 'Background check failed - graceful fallback',
                checkDurationMs: 0
            };
        });
    }
    
    /**
     * Clear license cache (for testing/debugging)
     */
    public clearCache(): void {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.CACHE_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            logger.info('LicenseManager', 'License cache cleared');
        } catch (error) {
            logger.warn('LicenseManager', 'Failed to clear license cache:', error);
        }
    }
    
    /**
     * Get cache statistics (for debugging)
     */
    public getCacheStats(): { cachedDomains: number; cacheSize: string } {
        try {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));
            
            let totalSize = 0;
            cacheKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value) {
                    totalSize += value.length;
                }
            });
            
            return {
                cachedDomains: cacheKeys.length,
                cacheSize: `${(totalSize / 1024).toFixed(2)} KB`
            };
        } catch (error) {
            return { cachedDomains: 0, cacheSize: '0 KB' };
        }
    }
}

/**
 * Convenience function for quick license checks
 * @returns Promise<boolean> - Whether the domain is authorized
 */
export async function isLicenseValid(): Promise<boolean> {
    const manager = LicenseManager.getInstance();
    const result = await manager.checkLicense();
    return result.authorized;
}

/**
 * Convenience function for instant free domain check
 * @returns boolean - Whether this is a free Framer domain
 */
export function isFreeFramerDomain(): boolean {
    const manager = LicenseManager.getInstance();
    return manager.isFreeFramerDomain();
}

/**
 * Convenience function to check if license verification should be skipped
 * @returns boolean - Whether license verification should be skipped (Canvas/Preview mode)
 */
export function shouldSkipLicenseVerification(): boolean {
    const environment = EnvironmentDetector.detect();
    return environment === FramerEnvironment.CANVAS || environment === FramerEnvironment.PREVIEW;
} 