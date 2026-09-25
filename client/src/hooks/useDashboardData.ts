import { useCallback, useEffect, useState } from 'react';
import { ANALYTICS_API, apiFetch } from '../api/client';
import type { SummaryResponse, TopProduct, TrendPoint } from '../api/types';

interface DashboardData {
  summary: SummaryResponse | null;
  trend: TrendPoint[];
  topProducts: TopProduct[];
  loading: boolean;
  refetch: () => void;
}

function dateRangeParams(days: number): string {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return `from=${from.toISOString()}&to=${to.toISOString()}`;
}

// ✅ Best Practice: one hook owns all three analytics calls for a given
// period — components just render {summary, trend, topProducts}, they
// never construct query strings or call apiFetch directly.
export function useDashboardData(periodDays: number): DashboardData {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => setRefetchToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const range = dateRangeParams(periodDays);
    setLoading(true);

    Promise.all([
      apiFetch<SummaryResponse>(ANALYTICS_API, `/analytics/summary?${range}`),
      apiFetch<TrendPoint[]>(ANALYTICS_API, `/analytics/trend?${range}`),
      apiFetch<TopProduct[]>(ANALYTICS_API, `/analytics/top-products?${range}&limit=8`),
    ])
      .then(([summaryData, trendData, topProductsData]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setTrend(trendData);
        setTopProducts(topProductsData);
      })
      .catch((err: Error) => {
        if (!cancelled && err.message !== 'session-expired') {
          console.error('Failed to load dashboard data', err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [periodDays, refetchToken]);

  return { summary, trend, topProducts, loading, refetch };
}
