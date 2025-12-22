/**
 * @file DelayedTriggerTest.tsx
 * @description Test component for delayed trigger functionality
 * 
 * @version 1.0.0
 * @since 1.0.0
 * 
 * This component tests both simple skip count mode and advanced pattern mode
 * for delayed triggers to ensure they work correctly.
 */

import React from 'react';
import { DelayedTriggerManager } from '../core/coordinators/DelayedTriggerManager.ts';
import { AnimationBehavior } from '../types/index.ts';

export function DelayedTriggerTest() {
    const [logs, setLogs] = React.useState<string[]>([]);
    const [manager] = React.useState(() => new DelayedTriggerManager());
    
    const addLog = (message: string) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };
    
    const testSimpleMode = () => {
        const config = {
            mode: 'simple' as const,
            skipCount: 3,
            behavior: AnimationBehavior.PLAY_FORWARD
        };
        
        const result = manager.shouldExecuteTrigger('test-simple', config);
        addLog(`SIMPLE MODE: ${result.debugInfo} -> ${result.shouldExecute ? 'EXECUTE' : 'SKIP'}`);
    };
    
    const testPatternMode = () => {
        const config = {
            mode: 'pattern' as const,
            pattern: '0,0,1,0,1',
            behavior: AnimationBehavior.PLAY_FORWARD
        };
        
        const result = manager.shouldExecuteTrigger('test-pattern', config);
        addLog(`PATTERN MODE: ${result.debugInfo} -> ${result.shouldExecute ? 'EXECUTE' : 'SKIP'}`);
    };
    
    const resetTests = () => {
        manager.resetSlot('test-simple');
        manager.resetSlot('test-pattern');
        setLogs([]);
        addLog('Reset all test states');
    };
    
    return (
        <div style={{ 
            padding: '20px', 
            fontFamily: 'monospace', 
            backgroundColor: '#f5f5f5',
            margin: '20px',
            borderRadius: '8px'
        }}>
            <h2>🎯 Delayed Trigger Test</h2>
            
            <div style={{ marginBottom: '20px' }}>
                <h3>Test Controls</h3>
                <button 
                    onClick={testSimpleMode}
                    style={{ 
                        margin: '5px', 
                        padding: '10px 15px',
                        backgroundColor: '#007acc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Test Simple Mode (Skip 3)
                </button>
                
                <button 
                    onClick={testPatternMode}
                    style={{ 
                        margin: '5px', 
                        padding: '10px 15px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Test Pattern Mode (0,0,1,0,1)
                </button>
                
                <button 
                    onClick={resetTests}
                    style={{ 
                        margin: '5px', 
                        padding: '10px 15px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Reset Tests
                </button>
            </div>
            
            <div>
                <h3>Test Results</h3>
                <div style={{ 
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    {logs.length === 0 ? (
                        <div style={{ color: '#666', fontStyle: 'italic' }}>
                            Click the test buttons to see delayed trigger behavior...
                        </div>
                    ) : (
                        logs.map((log, index) => (
                            <div key={index} style={{ 
                                marginBottom: '5px',
                                color: log.includes('EXECUTE') ? '#28a745' : 
                                      log.includes('SKIP') ? '#ffc107' : '#333'
                            }}>
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                <h4>Expected Behavior:</h4>
                <p><strong>Simple Mode (Skip 3):</strong> First 3 clicks = SKIP, 4th click = EXECUTE, then resets</p>
                <p><strong>Pattern Mode (0,0,1,0,1):</strong> SKIP, SKIP, EXECUTE, SKIP, EXECUTE, SKIP, SKIP, EXECUTE... (repeats)</p>
            </div>
        </div>
    );
} 