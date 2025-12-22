/**
 * FAME Animation System - Debug Manager
 * 
 * @fileOverview Sophisticated debug system for targeted debugging
 * @version 2.0.0-clean
 * @status ACTIVE - Core debug infrastructure
 * 
 * @description
 * Replaces the single debug boolean with a comprehensive debug system that allows
 * granular control over different types of debugging. Provides information flow
 * tracking, performance monitoring, and visual debugging aids.
 * 
 * Key features:
 * - Category-based debugging (data flow, animation, state, DOM, performance)
 * - Configurable log levels (minimal, normal, verbose, extreme)
 * - Information flow tracking across the entire system
 * - Performance measurement and monitoring
 * - Visual debugging aids (highlights, progress bars, etc.)
 * 
 * @example
 * ```typescript
 * // Enable only data flow debugging at verbose level
 * debugManager.configure({
 *   enabled: true,
 *   dataFlow: { enabled: true, logLevel: DebugLogLevel.VERBOSE }
 * });
 * 
 * // Track information flow
 * debugManager.trackDataFlow('Property controls processed', {
 *   phase: DebugPhase.PROPERTY_PROCESSING,
 *   slotId: 'slot-123',
 *   metadata: { slotsCount: 3 }
 * });
 * ```
 */

import { 
  DebugConfig, 
  DebugContext, 
  DebugPhase, 
  DebugLogLevel, 
  DebugPerformanceMeasurement 
} from '../../types/index.ts';

// Logger will be imported once we migrate it
// import { logger } from '../environment/Logger.ts';

/**
 * Centralized debug manager for the FAME system
 * Provides sophisticated debugging capabilities beyond a simple boolean
 */
export class DebugManager {
  private static instance: DebugManager;
  private config: DebugConfig;
  private performanceMeasurements: Map<string, DebugPerformanceMeasurement[]> = new Map();
  private visualDebugElements: Set<HTMLElement> = new Set();

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  /**
   * Configure debug settings
   */
  public configure(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled) {
      console.log('🔧 FAME Debug Manager configured:', this.config);
    }
  }

  /**
   * Get current debug configuration
   */
  public getConfig(): DebugConfig {
    return { ...this.config };
  }

  //=======================================
  //        DATA FLOW DEBUG METHODS
  //=======================================

  /**
   * Track data transformations across the system
   */
  public trackDataFlow(operation: string, context: Partial<DebugContext> = {}): void {
    if (!this.shouldLog('dataFlow')) return;

    const debugContext: DebugContext = {
      operation,
      phase: context.phase || DebugPhase.PROPERTY_PROCESSING,
      timestamp: Date.now(),
      ...context
    };

    this.log('dataFlow', `📊 DATA FLOW: ${operation}`, debugContext);
  }

  /**
   * Track property controls → AnimationSlot transformation
   */
  public trackPropertyControls(slotId: string, beforeData: any, afterData: any): void {
    if (!this.config.dataFlow?.propertyControls) return;

    this.trackDataFlow('Property Controls → AnimationSlot', {
      phase: DebugPhase.PROPERTY_PROCESSING,
      slotId,
      metadata: {
        beforeKeys: Object.keys(beforeData || {}),
        afterKeys: Object.keys(afterData || {}),
        transformation: 'PropertyControls → AnimationSlot'
      }
    });
  }

  /**
   * Track event flow from trigger to animation execution
   */
  public trackEventFlow(eventType: string, triggerElement: HTMLElement, animatedElements: HTMLElement[]): void {
    if (!this.config.dataFlow?.eventFlow) return;

    this.trackDataFlow('Event Flow', {
      phase: DebugPhase.ANIMATION_EXECUTION,
      elementId: triggerElement.id || 'no-id',
      metadata: {
        eventType,
        triggerTag: triggerElement.tagName,
        animatedCount: animatedElements.length,
        animatedTags: animatedElements.map(el => el.tagName)
      }
    });
  }

  //=======================================
  //        ANIMATION DEBUG METHODS
  //=======================================

  /**
   * Track animation execution details
   */
  public trackAnimation(operation: string, context: Partial<DebugContext> = {}): void {
    if (!this.shouldLog('animation')) return;

    const debugContext: DebugContext = {
      operation,
      phase: context.phase || DebugPhase.ANIMATION_EXECUTION,
      timestamp: Date.now(),
      ...context
    };

    this.log('animation', `🎬 ANIMATION: ${operation}`, debugContext);
  }

  /**
   * Track timing calculations
   */
  public trackTiming(slotId: string, timing: any): void {
    if (!this.config.animation?.timing) return;

    this.trackAnimation('Timing Calculation', {
      slotId,
      metadata: { timing }
    });
  }

  /**
   * Track stagger calculations
   */
  public trackStagger(slotId: string, elements: HTMLElement[], staggerConfig: any): void {
    if (!this.config.animation?.staggering) return;

    this.trackAnimation('Stagger Calculation', {
      slotId,
      metadata: {
        elementCount: elements.length,
        staggerConfig,
        elementIds: elements.map(el => el.id || 'no-id')
      }
    });
  }

  //=======================================
  //        STATE DEBUG METHODS
  //=======================================

  /**
   * Track state changes
   */
  public trackState(operation: string, context: Partial<DebugContext> = {}): void {
    if (!this.shouldLog('state')) return;

    const debugContext: DebugContext = {
      operation,
      phase: context.phase || DebugPhase.STATE_UPDATE,
      timestamp: Date.now(),
      ...context
    };

    this.log('state', `🎯 STATE: ${operation}`, debugContext);
  }

  /**
   * Track animation progress changes
   */
  public trackProgress(elementId: string, slotId: string, progress: number, status: string): void {
    if (!this.config.state?.progressTracking) return;

    this.trackState('Progress Update', {
      elementId,
      slotId,
      metadata: { progress, status }
    });
  }

  //=======================================
  //        DOM DEBUG METHODS
  //=======================================

  /**
   * Track DOM operations
   */
  public trackDOM(operation: string, context: Partial<DebugContext> = {}): void {
    if (!this.shouldLog('dom')) return;

    const debugContext: DebugContext = {
      operation,
      phase: context.phase || DebugPhase.ELEMENT_FINDING,
      timestamp: Date.now(),
      ...context
    };

    this.log('dom', `🌐 DOM: ${operation}`, debugContext);
  }

  /**
   * Track element finding operations
   */
  public trackElementFinding(selector: string, found: HTMLElement[], searchScope: string): void {
    if (!this.config.dom?.elementFinding) return;

    this.trackDOM('Element Finding', {
      metadata: {
        selector,
        foundCount: found.length,
        searchScope,
        foundIds: found.map(el => el.id || 'no-id')
      }
    });
  }

  /**
   * Track style applications
   */
  public trackStyleApplication(element: HTMLElement, property: string, value: any): void {
    if (!this.config.dom?.styleApplication) return;

    this.trackDOM('Style Application', {
      elementId: element.id || 'no-id',
      metadata: {
        property,
        value,
        elementTag: element.tagName
      }
    });
  }

  //=======================================
  //        PERFORMANCE DEBUG METHODS
  //=======================================

  /**
   * Start performance measurement
   */
  public startPerformanceMeasurement(operation: string): string {
    if (!this.shouldLog('performance')) return '';

    const measurementId = `${operation}-${Date.now()}-${Math.random()}`;
    
    if (!this.performanceMeasurements.has(operation)) {
      this.performanceMeasurements.set(operation, []);
    }

    const measurement: DebugPerformanceMeasurement = {
      operation,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      memoryBefore: this.getMemoryUsage()
    };

    // Store with ID for retrieval
    (measurement as any)._id = measurementId;
    this.performanceMeasurements.get(operation)!.push(measurement);

    return measurementId;
  }

  /**
   * End performance measurement
   */
  // public endPerformanceMeasurement(measurementId: string): void {
  //   if (!measurementId || !this.shouldLog('performance')) return;

  //   // Find the measurement by ID
  //   for (const measurements of this.performanceMeasurements.values()) {
  //     const measurement = measurements.find((m: any) => m._id === measurementId);
  //     if (measurement) {
  //       measurement.endTime = performance.now();
  //       measurement.duration = measurement.endTime - measurement.startTime;
  //       measurement.memoryAfter = this.getMemoryUsage();

  //       this.log('performance', `⚡ PERFORMANCE: ${measurement.operation} took ${measurement.duration.toFixed(2)}ms`, measurement);
  //       break;
  //     }
  //   }
  // }

  /**
   * Get performance summary
   */
  // public getPerformanceSummary(): Record<string, any> {
  //   const summary: Record<string, any> = {};

  //   for (const [operation, measurements] of this.performanceMeasurements.entries()) {
  //     const durations = measurements.map(m => m.duration);
  //     summary[operation] = {
  //       count: measurements.length,
  //       totalTime: durations.reduce((sum, d) => sum + d, 0),
  //       averageTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
  //       minTime: Math.min(...durations),
  //       maxTime: Math.max(...durations)
  //     };
  //   }

  //   return summary;
  // }

  //=======================================
  //        VISUAL DEBUG METHODS
  //=======================================

  /**
   * Highlight trigger elements
   */
  public highlightTriggerElements(elements: HTMLElement[]): void {
    if (!this.config.visual?.showTriggerElements) return;

    elements.forEach(element => {
      this.addVisualDebugStyle(element, 'trigger');
    });
  }

  /**
   * Highlight animated elements
   */
  public highlightAnimatedElements(elements: HTMLElement[]): void {
    if (!this.config.visual?.showAnimatedElements) return;

    elements.forEach(element => {
      this.addVisualDebugStyle(element, 'animated');
    });
  }

  /**
   * Show animation progress
   */
  public showAnimationProgress(element: HTMLElement, progress: number): void {
    if (!this.config.visual?.showProgress) return;

    // Create or update progress bar
    let progressBar = element.querySelector('.fame-debug-progress') as HTMLElement;
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'fame-debug-progress';
      progressBar.style.cssText = `
        position: absolute;
        top: -4px;
        left: 0;
        height: 4px;
        background: #00ff00;
        transition: width 0.1s ease;
        z-index: 9999;
        pointer-events: none;
      `;
      element.appendChild(progressBar);
      this.visualDebugElements.add(progressBar);
    }

    progressBar.style.width = `${progress * 100}%`;
  }

  /**
   * Clear all visual debug elements
   */
  public clearVisualDebug(): void {
    this.visualDebugElements.forEach(element => {
      element.remove();
    });
    this.visualDebugElements.clear();
  }

  //=======================================
  //        PRIVATE HELPER METHODS
  //=======================================

  private getDefaultConfig(): DebugConfig {
    return {
      enabled: false,
      dataFlow: { enabled: false, logLevel: DebugLogLevel.NORMAL },
      animation: { enabled: false, logLevel: DebugLogLevel.NORMAL },
      state: { enabled: false, logLevel: DebugLogLevel.NORMAL },
      dom: { enabled: false, logLevel: DebugLogLevel.NORMAL },
      performance: { enabled: false, logLevel: DebugLogLevel.NORMAL },
      visual: { enabled: false }
    };
  }

  private shouldLog(category: keyof DebugConfig): boolean {
    if (!this.config.enabled) return false;
    
    const categoryConfig = this.config[category];
    return categoryConfig && typeof categoryConfig === 'object' && 'enabled' in categoryConfig 
      ? categoryConfig.enabled 
      : false;
  }

  private log(category: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [FAME-${category.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
  }

  private addVisualDebugStyle(element: HTMLElement, type: 'trigger' | 'animated'): void {
    const color = type === 'trigger' ? '#ff0000' : '#0000ff';
    const originalOutline = element.style.outline;
    
    element.style.outline = `2px solid ${color}`;
    element.style.outlineOffset = '2px';
    
    // Add to cleanup set
    this.visualDebugElements.add(element);
    
    // Store original style for cleanup
    (element as any)._originalOutline = originalOutline;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

// Export singleton instance
export const debugManager = DebugManager.getInstance(); 