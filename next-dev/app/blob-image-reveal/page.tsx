"use client"

import BlobReveal from "./BlobReveal"

export default function BlobImageRevealPage() {
    return (
        <div className="min-h-screen bg-black p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-white text-4xl font-bold mb-8">Blob Image Reveal</h1>

                <div className="space-y-16">
                    {/* On Appear Example */}
                    <div>
                        <h2 className="text-white text-2xl mb-4">Trigger: On Appear</h2>
                        <div className="w-full h-96">
                            <BlobReveal
                                image={{
                                    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
                                }}
                                triggerMode="appear"
                                animationDuration={2.0}
                            />
                        </div>
                    </div>

                    {/* On Scroll Example */}
                    <div>
                        <h2 className="text-white text-2xl mb-4">Trigger: On Scroll</h2>
                        <div className="w-full h-96">
                            <BlobReveal
                                image={{
                                    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
                                }}
                                triggerMode="scroll"
                                animationDuration={3.0}
                            />
                        </div>
                    </div>

                    {/* Empty State Example */}
                    <div>
                        <h2 className="text-white text-2xl mb-4">Empty State</h2>
                        <div className="w-full h-96">
                            <BlobReveal
                                triggerMode="appear"
                                animationDuration={2.0}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
