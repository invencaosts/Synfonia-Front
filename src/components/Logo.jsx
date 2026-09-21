import React from 'react';

const Logo = ({ size = 'md', className = '', id = 'logo', stacked = false }) => {
  const sizes = {
    sm: { text: 'text-lg md:text-xl', wave: 'h-5 md:h-6', gap: 'gap-1', barWidth: 'w-0.5' },
    md: { text: 'text-2xl md:text-3xl', wave: 'h-8 md:h-10', gap: 'gap-1.5', barWidth: 'w-1' },
    lg: { text: 'text-3xl md:text-5xl', wave: 'h-10 md:h-14', gap: 'gap-2', barWidth: 'w-1.5' }
  };

  const s = sizes[size] || sizes.md;

  const barHeights = [10, 16, 24, 34, 20, 12, 28, 38, 22, 14, 26, 18];

  return (
    <div
      className={`flex ${stacked ? 'flex-col items-center gap-4' : 'flex-row items-end gap-3'} justify-center ${className}`}
      style={{ viewTransitionName: `site-logo-${id}` }}
    >
      <h1 
        className={`${s.text} font-['Syncopate'] font-bold tracking-[0.06em] uppercase text-brand-legible leading-none animate-[pulseBeat_1.4s_infinite_ease-in-out] origin-center select-none shadow-brand-text`}
      >
        SYNFONIA
      </h1>

      <div className={`flex items-end justify-center ${s.gap} ${s.wave}`} aria-hidden="true">
        {barHeights.map((height, i) => (
          <span
            key={i}
            className={`${s.barWidth} rounded-full origin-bottom animate-[waveBeat_1.4s_infinite_ease-in-out] shadow-lg`}
            style={{ 
              height: `${(height / 42) * 100}%`,
              animationDelay: `${i * 0.08}s`,
              background: `linear-gradient(to top, color-mix(in srgb, var(--color-brand) 70%, black), var(--color-brand), color-mix(in srgb, var(--color-brand) 70%, white))`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Logo;
