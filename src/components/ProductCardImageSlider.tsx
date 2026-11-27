"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ProductCardImageSliderProps {
  images: string[];
  title: string;
  intervalMs?: number;
}

export default function ProductCardImageSlider({
  images,
  title,
  intervalMs = 2800,
}: ProductCardImageSliderProps) {
  const validImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  useEffect(() => {
    if (validImages.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % validImages.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [validImages.length, isPaused, intervalMs]);

  if (validImages.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface text-xs text-ink-mute">
        No Image
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={validImages[activeIndex]}
          src={validImages[activeIndex]}
          alt={`${title} - view ${activeIndex + 1}`}
          initial={{ opacity: 0.35, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0.35 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>

      {validImages.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/35 backdrop-blur-xs px-2 py-1 rounded-full">
          {validImages.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeIndex ? "w-3.5 bg-white" : "w-1.5 bg-white/55"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}