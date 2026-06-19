import React from 'react';
import { ChevronDown } from 'lucide-react';
import { PeriodOption, PeriodValue } from './types';

interface PeriodSelectProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  options: PeriodOption[];
  ariaLabel: string;
}

export default function PeriodSelect({ value, onChange, options, ariaLabel }: PeriodSelectProps) {
  return (
    <div className="dash-period-select-wrapper">
      <select
        className="dash-period-select"
        value={value}
        onChange={(e) => onChange(e.target.value as PeriodValue)}
        aria-label={ariaLabel}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="dash-period-chevron" />
    </div>
  );
}
