import React, { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';

const assignRef = (ref, value) => {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
};

const ColorPicker = ({ color, onChange, onInput, inputRef, title }) => {
  const internalRef = useRef(null);
  const [localColor, setLocalColor] = useState(color || '#ffffff');
  const [prevColorProp, setPrevColorProp] = useState(color);

  if (color !== prevColorProp) {
    setPrevColorProp(color);
    setLocalColor(color || '#ffffff');
  }

  useEffect(() => {
    const el = internalRef.current;
    if (!el || !onChange) return;
    
    const handleChange = (e) => {
      onChange(e.target.value);
    };
    
    el.addEventListener('change', handleChange);
    return () => el.removeEventListener('change', handleChange);
  }, [onChange]);

  return (
    <label
      className="w-12 h-12 aspect-square rounded-full transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 ring-2 ring-brand/10 ring-offset-2 ring-offset-(--bg-card) bg-white shadow-lg relative group overflow-hidden cursor-pointer"
      title={title}
    >
      <Palette 
        size={20} 
        style={{ 
          fill: 'url(#palette-gradient)',
          stroke: 'currentColor',
          color: '#475569'
        }}
        className="relative z-10 pointer-events-none"
      />
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="palette-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
      </svg>
      <input
        ref={(el) => {
          internalRef.current = el;
          assignRef(inputRef, el);
        }}
        type="color"
        value={localColor}
        onChange={(e) => {
          setLocalColor(e.target.value);
          if (onInput) onInput(e.target.value);
        }}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-0"
      />
    </label>
  );
};

export default ColorPicker;
