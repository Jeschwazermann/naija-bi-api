import { PeriodPicker } from './PeriodPicker';
import type { SummaryResponse } from '../api/types';

function nairaFormat(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

interface StatsReceiptProps {
  summary: SummaryResponse | null;
  periodDays: number;
  onPeriodChange: (days: number) => void;
}

export function StatsReceipt({ summary, periodDays, onPeriodChange }: StatsReceiptProps) {
  return (
    <aside className="receipt">
      <p className="receipt-label">Last {periodDays} days</p>
      <p className="receipt-total">{nairaFormat(summary?.totalAmountNaira ?? 0)}</p>
      <p className="receipt-caption">Total revenue</p>

      <dl className="receipt-lines">
        <div className="receipt-line">
          <dt>Orders</dt>
          <dd>{(summary?.orderCount ?? 0).toLocaleString('en-NG')}</dd>
        </div>
        <div className="receipt-line">
          <dt>Days with sales</dt>
          <dd>{(summary?.daysWithSales ?? 0).toLocaleString('en-NG')}</dd>
        </div>
      </dl>

      <PeriodPicker value={periodDays} onChange={onPeriodChange} />
    </aside>
  );
}
