import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CostCard } from '../components/CostCard';
import { Loading } from '../components/Loading';
import { Alert } from '../components/Alert';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface BillingSummary {
  total_cost: number;
  daily_average: number;
  max_daily_cost: number;
  forecasted_monthly: number;
}

interface BillingRecord {
  date: string;
  total_cost: number;
  service_costs: Record<string, number>;
}

interface BillingHistory {
  records: BillingRecord[];
}

export const Billing: React.FC = () => {
  const [provider, setProvider] = useState('AWS');
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [history, setHistory] = useState<BillingHistory | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryData, historyData] = await Promise.all([
        api.getCostSummary(provider, days),
        api.getBillingHistory(provider, days),
      ]);
      setSummary(summaryData);
      setHistory(historyData);
    } catch (err: any) {
      setError('Failed to load billing data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [provider, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await api.fetchBilling(provider);
      setError('');
      await fetchData();
    } catch (err: any) {
      setError('Failed to sync billing data');
    } finally {
      setSyncing(false);
    }
  };

  const chartData = useMemo(
    () =>
      (history?.records || []).map((item) => ({
        date: item.date,
        total: item.total_cost,
      })),
    [history]
  );

  const serviceBreakdown = useMemo(() => {
    const serviceTotals: Record<string, number> = {};
    (history?.records || []).forEach((item: BillingRecord) => {
      const services = item.service_costs || {};
      Object.entries(services).forEach(([name, cost]) => {
        serviceTotals[name] = (serviceTotals[name] || 0) + Number(cost || 0);
      });
    });
    return serviceTotals;
  }, [history]);

  const formatCurrency = (value: any) => {
    if (typeof value === 'number') {
      return `$${value.toFixed(2)}`;
    }
    return '$0.00';
  };

  if (loading && !summary) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing & Analytics</h1>
            <p className="text-gray-600 mt-1">Detailed cost analysis and trends</p>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center space-x-2"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
          </Button>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Controls */}
        <div className="flex space-x-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Cloud Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="AWS">AWS</option>
              <option value="AZURE">Azure</option>
              <option value="GCP">GCP</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Period (Days)</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CostCard
              title="Total Cost"
              amount={summary.total_cost}
              currency="USD"
            />
            <CostCard
              title="Daily Average"
              amount={summary.daily_average}
              currency="USD"
            />
            <CostCard
              title="Highest Day"
              amount={summary.max_daily_cost}
              currency="USD"
            />
            <CostCard
              title="Forecasted Monthly"
              amount={summary.forecasted_monthly}
              currency="USD"
            />
          </div>
        )}

        {/* Cost Trend Chart */}
        {chartData.length > 0 && (
          <Card>
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <TrendingUp size={24} className="text-primary" />
              <span>Cost Trend</span>
            </h2>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  name="Daily Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Service Breakdown */}
        {Object.keys(serviceBreakdown).length > 0 && (
          <Card>
            <h2 className="text-2xl font-bold mb-6">Top Services by Cost</h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={Object.entries(serviceBreakdown)
                  .map(([service, cost]: [string, number]) => ({ service, cost }))
                  .sort((a, b) => (b.cost as number) - (a.cost as number))
                  .slice(0, 10)}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
                <Bar dataKey="cost" fill="#3B82F6" name="Cost" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* No Data */}
        {(!chartData || chartData.length === 0) && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No billing data available</p>
              <Button onClick={handleSync}>Fetch Billing Data</Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};
