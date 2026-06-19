import React, { ReactNode } from 'react';
import PeriodSelect from './PeriodSelect';
import { PeriodOption, PeriodValue } from './types';

interface CardHeaderProps {
  title: string;
  icon?: ReactNode;
  period?: PeriodValue;
  onPeriodChange?: (value: PeriodValue) => void;
  periodOptions?: PeriodOption[];
  periodLabel?: string;
  action?: ReactNode;
}

export default function CardHeader({
  title,
  icon,
  period,
  onPeriodChange,
  periodOptions,
  periodLabel,
  action,
}: CardHeaderProps) {
  return (
    <div className="dash-card-hdr">
      <div className="dash-card-hdr-left">
        {icon && <span className="dash-card-hdr-icon">{icon}</span>}
        <h3 className="dash-card-hdr-title">{title}</h3>
      </div>
      {period && onPeriodChange && periodOptions ? (
        <PeriodSelect
          value={period}
          onChange={onPeriodChange}
          options={periodOptions}
          ariaLabel={periodLabel || `${title} time period`}
        />
      ) : action ? (
        action
      ) : null}
    </div>
  );
}
