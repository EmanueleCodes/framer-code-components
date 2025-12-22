/**
 * @file SimpleLoadEventsTest.tsx
 * @description Simple test for load events fix
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import FAME from '../core/FAME.tsx';

export default function SimpleLoadEventsTest() {
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Simple Load Events Test</h1>
            <p>Testing the new load events fix that works in both Canvas and production.</p>
            
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
                    // Second load animation - slide in
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
                                from: 'translateX(-50px)',
                                to: 'translateX(0px)',
                                duration: 800,
                                easing: 'easeOut',
                                delay: 200
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
                        backgroundColor: '#28a745',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        margin: '20px 0'
                    }}
                >
                    Load Events Test
                </div>
            </FAME>
            
            <div style={{ marginTop: '20px' }}>
                <h3>Expected Behavior:</h3>
                <ul>
                    <li>✅ Element starts invisible (opacity: 0)</li>
                    <li>✅ Element fades in over 1 second</li>
                    <li>✅ Element slides in from left (200ms delay)</li>
                                    <li>✅ Both animations should play simultaneously</li>
                <li>✅ Should work in Framer preview and production (disabled in Canvas)</li>
                </ul>
            </div>
            
            <div style={{ marginTop: '20px' }}>
                <h3>What This Tests:</h3>
                <ul>
                    <li>✅ Multiple load events on same element</li>
                    <li>✅ Framer preview mode compatibility</li>
                    <li>✅ Production mode compatibility</li>
                    <li>✅ Canvas mode disabled (like scroll events)</li>
                    <li>✅ No window dependencies</li>
                    <li>✅ Simple timeout-based triggers</li>
                </ul>
            </div>
        </div>
    );
} 