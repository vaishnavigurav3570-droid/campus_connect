import React, { useRef, useState } from 'react';
import { X, Compass } from 'lucide-react';
import { Button } from './ui/button';

interface PanoramaViewerProps {
  imageUrl: string;
  title: string;
  onClose: () => void;
}

export function PanoramaViewer({ imageUrl, title, onClose }: PanoramaViewerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- MOUSE EVENTS (Desktop) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (containerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; // Speed multiplier
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const stopDragging = () => setIsDragging(false);

  // --- TOUCH EVENTS (Mobile) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - (containerRef.current?.offsetLeft || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    // Don't preventDefault here to allow vertical scrolling if needed, 
    // or use e.preventDefault() if you want to lock the page.
    const x = e.touches[0].pageX - (containerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2; 
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" /> {title}
          </h2>
          <p className="text-xs text-gray-300">Swipe to look around</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-full">
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* The 360 Image Viewport */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing no-scrollbar flex items-center bg-black"
        
        // Mouse Listeners
        onMouseDown={handleMouseDown}
        onMouseLeave={stopDragging}
        onMouseUp={stopDragging}
        onMouseMove={handleMouseMove}

        // Touch Listeners (Added for Mobile)
        onTouchStart={handleTouchStart}
        onTouchEnd={stopDragging}
        onTouchMove={handleTouchMove}
        
        style={{ perspective: '1000px' }}
      >
        {/* Wide Image Simulation */}
        <img 
          src={imageUrl} 
          alt="360 view" 
          className="max-w-none h-full object-cover min-w-[200vw]" 
          draggable={false}
        />
      </div>
    </div>
  );
}