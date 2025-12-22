/**
 * @file MultipleLoadEventsTest.tsx
 * @description Test component to verify multiple load events work correctly
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @example
 * ```tsx
 * <MultipleLoadEventsTest />
 * ```
 */

import React from 'react';
import FAME from '../core/FAME.tsx';

export default function MultipleLoadEventsTest() {
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Multiple Load Events Test</h1>
            <p>This test verifies that multiple load events can coexist on the same element.</p>
            
            <FAME
                animationSlots={[
                    // First load animation - fade in
                    {
                        id: 'load-fade-in',
                        triggers: [
                            {
                                selection: { scope: 'document' },
                                event: 'load',
                                behavior: 'playForward'
                            }
                        ],
                        animatedElements: [
                            {
                                selection: { 
                                    scope: 'document',
                                    criteria: [{ type: 'elementId', value: 'test-element' }]
                                }
                            }
                        ],
                        animationMode: 'timed',
                        properties: [
                            {
                                property: 'opacity',
                                from: 0,
                                to: 1,
                                duration: 1000,
                                easing: 'easeOut'
                            }
                        ]
                    },
                    // Second load animation - slide in from left
                    {
                        id: 'load-slide-in',
                        triggers: [
                            {
                                selection: { scope: 'document' },
                                event: 'load',
                                behavior: 'playForward'
                            }
                        ],
                        animatedElements: [
                            {
                                selection: { 
                                    scope: 'document',
                                    criteria: [{ type: 'elementId', value: 'test-element' }]
                                }
                            }
                        ],
                        animationMode: 'timed',
                        properties: [
                            {
                                property: 'transform',
                                from: 'translateX(-100px)',
                                to: 'translateX(0px)',
                                duration: 800,
                                easing: 'easeOut',
                                delay: 200
                            }
                        ]
                    },
                    // Third load animation - scale up
                    {
                        id: 'load-scale-up',
                        triggers: [
                            {
                                selection: { scope: 'document' },
                                event: 'load',
                                behavior: 'playForward'
                            }
                        ],
                        animatedElements: [
                            {
                                selection: { 
                                    scope: 'document',
                                    criteria: [{ type: 'elementId', value: 'test-element' }]
                                }
                            }
                        ],
                        animationMode: 'timed',
                        properties: [
                            {
                                property: 'transform',
                                from: 'scale(0.5)',
                                to: 'scale(1)',
                                duration: 600,
                                easing: 'easeOut',
                                delay: 400
                            }
                        ]
                    }
                ]}
            >
                <div 
                    id="test-element"
                    style={{
                        width: '200px',
                        height: '100px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }}
                >
                    Multiple Load Events
                </div>
            </FAME>
            
            <div style={{ marginTop: '20px' }}>
                <h3>Expected Behavior:</h3>
                <ul>
                    <li>✅ Element starts invisible (opacity: 0)</li>
                    <li>✅ Element fades in over 1 second</li>
                    <li>✅ Element slides in from left (200ms delay)</li>
                    <li>✅ Element scales up from 0.5 to 1 (400ms delay)</li>
                    <li>✅ All animations should play simultaneously when page loads</li>
                </ul>
            </div>
            
            <div style={{ marginTop: '20px' }}>
                <h3>Test Instructions:</h3>
                <ol>
                    <li>Refresh the page</li>
                    <li>Watch the element animate with all three load animations</li>
                    <li>Check browser console for load event logs</li>
                    <li>Verify that all three animations trigger and complete</li>
                </ol>
            </div>
        </div>
    );
} 