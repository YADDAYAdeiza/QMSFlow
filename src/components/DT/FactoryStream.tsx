"use client";
import React, { useEffect, useRef, useState } from 'react';

// GLOBAL INTERCEPTOR (Remains critical for Port 80 rerouting)
if (typeof window !== "undefined" && !(window as any).psInterceptionActive) {
    const NativeWebSocket = window.WebSocket;
    (window as any).WebSocket = function (url: string, protocols?: string | string[]) {
        if (url.includes("localhost:3000") || url.includes("127.0.0.1:3000")) {
            return new NativeWebSocket("ws://127.0.0.1:80", protocols);
        }
        return new NativeWebSocket(url, protocols);
    };
    (window as any).psInterceptionActive = true;
    (window as any).WebSocket.prototype = NativeWebSocket.prototype;
}

const PSLibPromise = import('@epicgames-ps/lib-pixelstreamingfrontend-ue5.6');

export default function FactoryStream() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [ps, setPs] = useState<any>(null);
    const [status, setStatus] = useState("Handshaking...");

    useEffect(() => {
        if (typeof window === "undefined") return;

        const init = async () => {
            const PSLib = await PSLibPromise;
            
            const config = new PSLib.Config({
                initialSettings: {
                    SignallingServerAddress: "ws://127.0.0.1:80",
                    AutoConnect: false, // We handle the "Subscribe" manually
                    AutoPlay: true,
                }
            } as any);

            // Essential 5.6 Patch
            if (!(config as any)._addOnSettingChangedListener) {
                (config as any)._addOnSettingChangedListener = () => {};
            }

            const pixelStreaming = new PSLib.PixelStreaming(config);
            setPs(pixelStreaming);

            pixelStreaming.addEventListener('connected', () => setStatus("Socket Active"));
            pixelStreaming.addEventListener('playStream', () => setStatus("Live"));

            const interval = setInterval(() => {
                if (pixelStreaming.videoElement?.srcObject && videoRef.current) {
                    if (videoRef.current.srcObject !== pixelStreaming.videoElement.srcObject) {
                        videoRef.current.srcObject = pixelStreaming.videoElement.srcObject;
                        videoRef.current.play().catch(() => {});
                        setStatus("Live");
                    }
                }
            }, 500);

            return () => clearInterval(interval);
        };

        init();
    }, []);

    // MANUAL PROTOCOL INJECTION
    const forceSubscribe = (streamerId: string) => {
        if (!ps) return;
        setStatus(`Subscribing to ${streamerId}...`);
        
        try {
            // 1. We access the internal WebSocket signaling protocol
            // 2. We send a raw JSON message that 5.6 Signaling Servers expect
            const msg = JSON.stringify({ type: "subscribe", streamerId: streamerId });
            (ps as any).signallingProtocol.ws.send(msg);
            
            console.log(`📡 RAW SENT: ${msg}`);
        } catch (err) {
            console.error("Injection Failed:", err);
            // Fallback: try the library's built-in method
            ps.connect(streamerId);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 bg-slate-900 rounded-xl shadow-2xl border border-slate-800">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6 border-2 border-slate-700">
                <video 
                    ref={videoRef}
                    autoPlay muted playsInline 
                    className="w-full h-full min-h-[400px] object-contain"
                />
                
                <div className="absolute top-4 left-4 flex gap-2 items-center">
                    <div className={`w-3 h-3 rounded-full ${status === "Live" ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-[10px] text-white font-mono font-bold bg-black/60 px-2 py-1 rounded">
                        {status}
                    </span>
                </div>

                {status !== "Live" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-6">
                        <div className="text-center">
                            <p className="text-blue-400 font-mono text-xs uppercase mb-2">Protocol Link Found</p>
                            <h2 className="text-white font-bold text-lg">Select Factory Feed</h2>
                        </div>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={() => forceSubscribe("DefaultStreamer")}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold shadow-lg transition-all"
                            >
                                START FEED 1
                            </button>
                            <button 
                                onClick={() => forceSubscribe("DefaultStreamer1")}
                                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-md font-bold shadow-lg transition-all"
                            >
                                START FEED 2
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 italic">Verify Standalone Game is focused on your i9</p>
                    </div>
                )}
            </div>

            <div className="flex justify-center gap-4">
                {['ColdRoom', 'Processing', 'HayRoom'].map((room) => (
                    <button 
                        key={room}
                        onClick={() => ps?.emitUIInteraction({ Console: room })}
                        className="px-6 py-3 bg-slate-800 text-white font-bold rounded-lg border-b-4 border-slate-950"
                    >
                        📍 {room}
                    </button>
                ))}
            </div>
        </div>
    );
}