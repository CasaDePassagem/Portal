import { useEffect, useRef, useState } from 'react';

export type SelectOption = {
  label: string;
  value: string;
};

interface SelectFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function SelectField({ label, value, onChange, options, placeholder = 'Selecione...', disabled }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`w-full px-3 py-2 border rounded-lg bg-theme-base text-left flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'border-theme focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}
        `}
      >
        <span className={selected ? 'text-theme-primary' : 'text-theme-secondary'}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && !disabled && (
        <div className="mt-1 border border-theme rounded-lg bg-theme-surface shadow-lg z-10">
          <ul className="max-h-48 overflow-y-auto">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-theme-surface-hover transition-colors
                    ${option.value === value ? 'bg-blue-500/10 text-blue-600 font-medium' : 'text-theme-primary'}
                  `}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
