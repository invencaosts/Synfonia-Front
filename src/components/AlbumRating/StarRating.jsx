import React, { useRef, useState } from 'react';
import { Star } from 'lucide-react';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const StarRating = ({ value = 0, onChange, readOnly = false, size = 28, filledColor, emptyColor }) => {
  const containerRef = useRef(null);
  const [dragValue, setDragValue] = useState(null);
  const isDragging = dragValue !== null;

  const displayValue = isDragging ? dragValue : value;

  const computeValue = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const raw = (x / rect.width) * 5;
    return clamp(Math.round(raw * 2) / 2, 0, 5);
  };

  const handlePointerDown = (e) => {
    if (readOnly) return;
    containerRef.current?.setPointerCapture?.(e.pointerId);
    setDragValue(computeValue(e.clientX));
  };

  const handlePointerMove = (e) => {
    if (readOnly || !isDragging) return;
    setDragValue(computeValue(e.clientX));
  };

  const commit = (e) => {
    if (readOnly || !isDragging) return;
    const finalValue = computeValue(e.clientX);
    setDragValue(null);
    onChange && onChange(finalValue);
  };

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-1 select-none ${readOnly ? '' : 'cursor-pointer touch-none'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commit}
      onPointerCancel={() => setDragValue(null)}
    >
      {[1, 2, 3, 4, 5].map((estrela) => {
        const fillPercent = clamp(displayValue - (estrela - 1), 0, 1) * 100;
        return (
          <span key={estrela} className="relative shrink-0" style={{ width: size, height: size }}>
            {emptyColor ? (
              <Star size={size} color={emptyColor} className="absolute inset-0" />
            ) : (
              <Star size={size} className="absolute inset-0 text-dim" />
            )}
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
              {filledColor ? (
                <Star size={size} color={filledColor} fill={filledColor} />
              ) : (
                <Star size={size} className="text-brand fill-brand" />
              )}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default StarRating;
