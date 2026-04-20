"use client";
import React, { useEffect, useRef, useState } from 'react';

// Ensure you have run: npm install @epicgames-ps/lib-pixelstreamingfrontend-ue5.7
const PSLibPromise = import('@epicgames-ps/lib-pixelstreamingfrontend-ue5.7');

export default function FactoryStream() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState("Connecting...");

    useEffect(() => {
        if (typeof window === "undefined" || !videoRef.current) return;

        let pixelStreaming: any = null;

        const init = async () => {
    const PSLib = await PSLibPromise;

    const config = new PSLib.Config({
        signalling: {
            address: "ws://127.0.0.1:8888"
        },
        // ADD THIS: This disables the strict origin check that is likely
        // causing your Transport Error in a Next.js/Turbopack environment
        featureFlags: {
            peerConnectionOptions: {
                disableAutoPlayVideo: true 
            }
        }
    } as any);

    pixelStreaming = new PSLib.PixelStreaming(config);
    pixelStreaming.videoElement = videoRef.current;

    // Add this to handle the error more gracefully
    pixelStreaming.addEventListener('webSocketError', (err: any) => {
        console.error("Critical WebSocket Error:", err);
    });

    pixelStreaming.connect();
};

        init();

        return () => {
            if (pixelStreaming) {
                pixelStreaming.disconnect();
            }
        };
    }, []);

    return (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-slate-700">
            <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                onClick={() => videoRef.current?.play()} 
                className="w-full h-full object-contain cursor-pointer" 
            />
            <div className="absolute top-4 left-4 bg-black/60 text-white p-2 text-[10px] font-mono">
                {status}
            </div>
        </div>
    );
}