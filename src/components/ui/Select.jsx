import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Select estilizado do sistema. Variant "pill" é o padrão (mesmo visual do
 * antigo dropdown "Ordenar" da Biblioteca); variant "field" ocupa a altura
 * do container pai, para uso dentro de barras de busca/formulário.
 */
const Select = ({
  value,
  onChange,
  options,
  placeholder = 'Selecionar',
  icon: Icon,
  labelPrefix,
  variant = 'pill',
  align = 'left',
  renderOptionExtra,
  className = '',
  menuClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const triggerClassName = variant === 'field'
    ? 'w-full h-full flex items-center justify-between gap-2 bg-(--bg-card) border border-(--border-subtle) rounded-2xl px-4 py-4 text-main font-medium text-sm md:text-base cursor-pointer transition-all hover:bg-(--bg-side) focus:border-brand outline-none'
    : 'flex items-center gap-2 px-4 py-2.5 glass-panel border border-(--border-subtle) rounded-xl text-xs font-bold text-dim hover:text-main hover:bg-(--bg-side) transition-all cursor-pointer outline-none';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={triggerClassName}
      >
        {Icon && <Icon size={14} className="shrink-0" />}
        <span className="truncate">
          {labelPrefix && <span>{labelPrefix} </span>}
          <span className={labelPrefix ? 'text-brand ml-1' : 'truncate'}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown size={14} className={`text-dim shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 min-w-full w-max glass-panel border border-(--border-subtle) rounded-2xl shadow-2xl py-2 overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'} ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between gap-3 ${
                  isSelected ? 'text-brand bg-brand/10' : 'text-dim hover:text-main hover:bg-(--bg-side)'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (renderOptionExtra ? renderOptionExtra(opt) : <Check size={14} className="shrink-0" />)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Select;
