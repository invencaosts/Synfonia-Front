import React from 'react';

const Input = ({ 
  label, 
  icon: Icon, 
  error, 
  className = '', 
  containerClassName = '',
  rightElement,
  ...props 
}) => {
  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-xs font-semibold text-dim uppercase tracking-wider ml-1">
          {label}
        </label>
      ) }
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-dim/50 group-focus-within:text-brand transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          className={`
            w-full bg-main/5 border border-(--border-subtle) rounded-2xl py-3.5 outline-none 
            focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-all 
            text-main text-sm placeholder:text-dim/40
            ${Icon ? 'pl-12' : 'pl-5'} 
            ${rightElement ? 'pr-12' : 'pr-5'}
            ${error ? 'border-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-[10px] text-red-500 font-medium ml-1">{error}</p>}
    </div>
  );
};

export default Input;
