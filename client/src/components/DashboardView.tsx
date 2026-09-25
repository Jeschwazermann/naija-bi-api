import { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { StatsReceipt } from './StatsReceipt';
import { UploadPanel } from './UploadPanel';
import { RevenueChart } from './RevenueChart';
import { TopProductsTable } from './TopProductsTable';

export function DashboardView() {
  const [periodDays, setPeriodDays] = useState(30);
  const { summary, trend, topProducts, refetch } = useDashboardData(periodDays);

  return (
    <section className="dashboard-view">
      <div className="dashboard-grid">
        <StatsReceipt summary={summary} periodDays={periodDays} onPeriodChange={setPeriodDays} />

        <div className="main-col">
          <UploadPanel onUploadComplete={refetch} />

          <section className="panel">
            <h2 className="panel-title">Daily revenue</h2>
            <RevenueChart trend={trend} />
          </section>

          <section className="panel">
            <h2 className="panel-title">Top products</h2>
            <TopProductsTable products={topProducts} />
          </section>
        </div>
      </div>
    </section>
  );
}
