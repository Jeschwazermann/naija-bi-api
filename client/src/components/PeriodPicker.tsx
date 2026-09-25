const PERIODS = [7, 30, 90] as const;

interface PeriodPickerProps {
  value: number;
  onChange: (days: number) => void;
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  return (
    <div className="period-picker" role="group" aria-label="Time period">
      {PERIODS.map((days) => (
        <button
          key={days}
          type="button"
          className={`period-btn${days === value ? ' is-active' : ''}`}
          onClick={() => onChange(days)}
        >
          {days}d
        </button>
      ))}
    </div>
  );
}
