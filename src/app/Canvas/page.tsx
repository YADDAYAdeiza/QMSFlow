'use client';

import { useEffect, useRef, useState } from 'react';

export default function FactoryFloor() {
  const canvasRef = useRef(null);
  
  // State tracking our equipment nodes
  const [nodes, setNodes] = useState([
    { id: "borehole_pump_01", type: "Pump", x: 100, y: 250, radius: 40, color: '#10b981' },
    { id: "sand_filter_01", type: "Sand Filter", x: 260, y: 250, radius: 40, color: '#3b82f6' },
    { id: "carbon_filter_01", type: "Carbon Filter", x: 420, y: 250, radius: 40, color: '#8b5cf6' }
  ]);

  // Refs to keep track of drag state across mouse events without forcing re-renders
  const dragRef = useRef({
    isDragging: false,
    nodeId: null,
    startX: 0,
    startY: 0
  });

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // 1. Clear previous frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw blueprint grid background
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let i = 0; i < canvas.width; i += gridSize) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
    }

    // 3. Draw Equipment Nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1f2937';
      ctx.stroke();
      
      // Node Text Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.type, node.x, node.y);
    });
  }, [nodes]);

  // Helper function to calculate distance using Pythagorean theorem
  const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  // MOUSE DOWN: Check if we are clicking a node
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Calculate exact mouse position relative to canvas coordinates
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Search nodes from back to front to grab the top-most object
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const distance = getDistance(mouseX, mouseY, node.x, node.y);
      
      // If click is within the circle radius, start dragging
      if (distance <= node.radius) {
        dragRef.current = {
          isDragging: true,
          nodeId: node.id,
          startX: mouseX - node.x, // Store offset relative to circle center
          startY: mouseY - node.y
        };
        break;
      }
    }
  };

  // MOUSE MOVE: Update positions smoothly
  const handleMouseMove = (e) => {
    if (!dragRef.current.isDragging) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { nodeId, startX, startY } = dragRef.current;

    // Map through our state arrays to update the active node's coordinates
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (node.id === nodeId) {
          // Boundary checking to keep equipment inside the canvas workspace
          let newX = mouseX - startX;
          let newY = mouseY - startY;
          
          newX = Math.max(node.radius, Math.min(canvas.width - node.radius, newX));
          newY = Math.max(node.radius, Math.min(canvas.height - node.radius, newY));

          return { ...node, x: newX, y: newY };
        }
        return node;
      })
    );
  };

  // MOUSE UP: Stop dragging operation
  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    dragRef.current.nodeId = null;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Sachet Water Mogul</h1>
        <p className="text-gray-400 text-sm mb-4">Click and drag equipment to arrange your purification line layout.</p>
        
        <div className="bg-white rounded-xl shadow-2xl p-3 inline-block border-4 border-gray-700">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={450} 
            className="bg-gray-50 border border-gray-300 rounded cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} // Safeguard if user drags mouse out of layout bounds
          />
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-gray-400">
          <div><span className="font-semibold text-emerald-400">● Pump:</span> Draws raw water source.</div>
          <div><span className="font-semibold text-blue-400">● Sand Filter:</span> Removes heavy sediment.</div>
          <div><span className="font-semibold text-purple-400">● Carbon Filter:</span> Clears odors and taste issues.</div>
        </div>
      </div>
    </div>
  );
}