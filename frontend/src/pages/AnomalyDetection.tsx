import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Alert } from '../components/Alert';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Activity, Zap } from 'lucide-react';

interface AnomalyHistoryRecord {
  date: string;
  total_cost: number;
  is_anomaly: boolean;
  anomaly_score: number;
}

interface ChartPoint {
  date: string;
  total: number;
  isAnomaly: boolean;
}

interface DetectedAnomaly {
  date: string;
  expected_cost: number;
  actual_cost: number;
  spike_percentage: number;
  reason: string;
}

export const AnomalyDetection: React.FC = () => {
  const [provider, setProvider] = useState('AWS');
  const [anomalies, setAnomalies] = useState<DetectedAnomaly[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  const fetchAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getBillingHistory(provider, 90);

      const records: AnomalyHistoryRecord[] = data.records || [];
      const processedData = records.map((item) => ({
        date: item.date,
        total: Number(item.total_cost || 0),
        isAnomaly: Boolean(item.is_anomaly),
      }));
      const detectedAnomalies = records
        .filter((item) => item.is_anomaly)
        .map((item) => {
          // API anomaly_score is treated as percentage spike over baseline.
          // expected = actual / (1 + spike%)
          const spikePercentage = Number(item.anomaly_score || 0);
          const baselineMultiplier = 1 + spikePercentage / 100;
          const safeMultiplier = baselineMultiplier > 0.1 ? baselineMultiplier : 1;
          return {
            spike_percentage: spikePercentage,
            date: item.date,
            expected_cost: Number(item.total_cost || 0) / safeMultiplier,
            actual_cost: Number(item.total_cost || 0),
            reason: item.anomaly_score ? `Anomaly score ${item.anomaly_score}` : '',
          };
        });

      setChartData(processedData);
      setAnomalies(detectedAnomalies);
    } catch (err: any) {
      setError('Failed to load anomaly data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const handleTestAnomaly = async () => {
    try {
      setTesting(true);
      await api.testAnomaly(provider);
      setError('');
      setTimeout(fetchAnomalies, 2000);
    } catch (err: any) {
      setError('Failed to trigger test anomaly');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <AlertTriangle size={32} className="text-warning" />
              <span>Anomaly Detection</span>
            </h1>
            <p className="text-gray-600 mt-1">AI-powered cost spike detection</p>
          </div>
          <Button onClick={handleTestAnomaly} disabled={testing}>
            {testing ? 'Testing...' : 'Test Detection'}
          </Button>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Controls */}
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

        {/* Anomaly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center space-x-4">
              <AlertTriangle size={32} className="text-warning opacity-20" />
              <div>
                <p className="text-gray-600 text-sm">Detected Anomalies</p>
                <p className="text-3xl font-bold text-gray-900">{anomalies.length}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-4">
              <TrendingUp size={32} className="text-danger opacity-20" />
              <div>
                <p className="text-gray-600 text-sm">Avg Spike</p>
                <p className="text-3xl font-bold text-gray-900">
                  {anomalies.length > 0
                    ? `${(
                        anomalies.reduce((sum, a) => sum + (a.spike_percentage || 0), 0) /
                        anomalies.length
                      ).toFixed(1)}%`
                    : '-'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-4">
              <Activity size={32} className="text-primary opacity-20" />
              <div>
                <p className="text-gray-600 text-sm">Detection Status</p>
                <p className="text-3xl font-bold text-success">Active</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Anomaly Chart */}
        {chartData.length > 0 && (
          <Card>
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
              <Zap size={24} className="text-primary" />
              <span>Cost Timeline with Anomalies</span>
            </h2>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `$${value.toFixed(2)}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.isAnomaly) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill="#EF4444"
                          stroke="#DC2626"
                          strokeWidth={2}
                        />
                      );
                    }
                    return null;
                  }}
                  name="Daily Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Detected Anomalies List */}
        {anomalies.length > 0 && (
          <Card>
            <h2 className="text-2xl font-bold mb-6">Detected Anomalies</h2>

            <div className="space-y-4">
              {anomalies.map((anomaly, idx) => (
                <div key={idx} className="p-4 border border-warning rounded-lg bg-warning bg-opacity-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900">{anomaly.date}</h3>
                    <span className="px-3 py-1 bg-warning bg-opacity-20 text-warning font-semibold rounded-full text-sm">
                      {anomaly.spike_percentage?.toFixed(1)}% spike
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Expected Cost</p>
                      <p className="font-semibold">${anomaly.expected_cost?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Actual Cost</p>
                      <p className="font-semibold text-danger">${anomaly.actual_cost?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Difference</p>
                      <p className="font-semibold text-danger">
                        +${((anomaly.actual_cost || 0) - (anomaly.expected_cost || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {anomaly.reason && (
                    <p className="mt-3 text-gray-700 text-sm">{anomaly.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* No Anomalies */}
        {anomalies.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <Activity size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No anomalies detected</p>
              <p className="text-gray-500 text-sm mt-2">Your costs are stable and within expected ranges</p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
};
