import { useMemo } from 'react';
import type { TrendPoint } from '../api/types';

function nairaFormat(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function RevenueChart({ trend }: { trend: TrendPoint[] }) {
  const max = useMemo(() => Math.max(...trend.map((d) => d.amountNaira), 1), [trend]);

  if (trend.length === 0) {
    return (
      <p className="empty-note">
        No sales recorded in this period yet — upload a CSV to get started.
      </p>
    );
  }

  return (
    <div className="chart" aria-hidden="true">
      {trend.map((day) => (
        <div
          key={day.date}
          className="chart-bar"
          style={{ height: `${Math.max((day.amountNaira / max) * 100, 1.5)}%` }}
          title={`${day.date} — ${nairaFormat(day.amountNaira)} (${day.orderCount} orders)`}
        />
      ))}
    </div>
  );
}
