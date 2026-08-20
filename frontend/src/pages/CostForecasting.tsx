import React, { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { AlertTriangle, Download, TrendingDown, TrendingUp } from 'lucide-react';

type ServiceKey = 'EC2' | 'RDS' | 'Storage' | 'Network' | 'Other';

interface HistoricalPoint {
  month: string;
  total: number;
  services: Record<ServiceKey, number>;
}

interface ForecastPoint {
  month: string;
  predicted: number;
  confidence: number;
}

const HISTORY_TOTALS = [910, 940, 960, 995, 1020, 1060, 1090, 1125, 1400, 1180, 1215, 1260];
const EMA_ALPHA = 0.35;
const CONFIDENCE_START = 97;
const CONFIDENCE_DECAY_PER_MONTH = 2.2;
const MIN_CONFIDENCE = 62;
const ANOMALY_STD_THRESHOLD = 1.5;
const MIN_SCENARIO_GROWTH_RATE = -3;
const MAX_SCENARIO_GROWTH_RATE = 20;
const TREND_STABLE_THRESHOLD = 0.001;
const SERVICE_MIX: Record<ServiceKey, number> = {
  EC2: 0.46,
  RDS: 0.2,
  Storage: 0.16,
  Network: 0.1,
  Other: 0.08,
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
const formatTooltipValue = (
  value: number | string | Array<number | string> | ReadonlyArray<number | string> | undefined
): string => {
  if (typeof value === 'number') {
    return formatCurrency(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : formatCurrency(parsed);
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    const parsed = typeof first === 'number' ? first : Number(first);
    return Number.isNaN(parsed) ? String(first) : formatCurrency(parsed);
  }
  return '$0.00';
};

const getRelativeMonthLabel = (offsetFromCurrentMonth: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + offsetFromCurrentMonth);
  return date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

export const CostForecasting: React.FC = () => {
  const [scenarioGrowthRate, setScenarioGrowthRate] = useState(5);

  const historicalData = useMemo<HistoricalPoint[]>(
    () =>
      HISTORY_TOTALS.map((total, idx) => ({
        month: getRelativeMonthLabel(idx - (HISTORY_TOTALS.length - 1)),
        total,
        services: {
          EC2: total * SERVICE_MIX.EC2,
          RDS: total * SERVICE_MIX.RDS,
          Storage: total * SERVICE_MIX.Storage,
          Network: total * SERVICE_MIX.Network,
          Other: total * SERVICE_MIX.Other,
        },
      })),
    []
  );

  const modelResults = useMemo(() => {
    const totals = historicalData.map((point) => point.total);
    const first = totals[0];
    const last = totals[totals.length - 1];
    const monthlyGrowthRate = ((last - first) / first) / (totals.length - 1);
    const ema = totals.reduce(
      (emaValue, value, idx) => (idx === 0 ? value : EMA_ALPHA * value + (1 - EMA_ALPHA) * emaValue),
      totals[0]
    );

    const forecast: ForecastPoint[] = Array.from({ length: 12 }, (_, idx) => {
      const monthAhead = idx + 1;
      const trendAdjusted = ema * Math.pow(1 + monthlyGrowthRate, monthAhead);
      return {
        month: getRelativeMonthLabel(monthAhead),
        predicted: Math.max(0, trendAdjusted),
        confidence: Math.max(MIN_CONFIDENCE, CONFIDENCE_START - monthAhead * CONFIDENCE_DECAY_PER_MONTH),
      };
    });

    const average = totals.reduce((sum, value) => sum + value, 0) / totals.length;
    const variance = totals.reduce((sum, value) => sum + (value - average) ** 2, 0) / totals.length;
    const stdDev = Math.sqrt(variance);
    const anomalies = historicalData
      .map((point) => ({
        ...point,
        deviation: stdDev === 0 ? 0 : ((point.total - average) / stdDev),
      }))
      .filter((point) => Math.abs(point.deviation) >= ANOMALY_STD_THRESHOLD);

    return {
      monthlyGrowthRate,
      forecast,
      anomalies,
    };
  }, [historicalData]);

  const { monthlyGrowthRate, forecast, anomalies } = modelResults;
  const shortTermForecast = forecast[2];
  const mediumTermForecast = forecast[5];
  const longTermForecast = forecast[11];

  const chartData = useMemo(
    () => [
      ...historicalData.map((point) => ({
        month: point.month,
        historicalCost: point.total,
        predictedCost: null as number | null,
      })),
      ...forecast.map((point) => ({
        month: point.month,
        historicalCost: null as number | null,
        predictedCost: point.predicted,
      })),
    ],
    [forecast, historicalData]
  );

  const scenarioData = useMemo(() => {
    const start = historicalData[historicalData.length - 1].total;
    const scenario = Array.from({ length: 12 }, (_, idx) => {
      const monthAhead = idx + 1;
      return {
        month: getRelativeMonthLabel(monthAhead),
        baseline: forecast[idx].predicted,
        scenario: start * Math.pow(1 + scenarioGrowthRate / 100, monthAhead),
      };
    });
    return scenario;
  }, [forecast, historicalData, scenarioGrowthRate]);

  const serviceBreakdownData = useMemo(() => {
    const projectedYearTotal = forecast.reduce((sum, point) => sum + point.predicted, 0);
    return (Object.keys(SERVICE_MIX) as ServiceKey[]).map((service) => ({
      service,
      cost: projectedYearTotal * SERVICE_MIX[service],
    }));
  }, [forecast]);

  const recommendationItems = useMemo(() => {
    const items = [
      monthlyGrowthRate > 0.02
        ? 'Commit a portion of stable EC2 and RDS usage to reserved pricing to offset forecasted growth.'
        : 'Current trend is stable — keep rightsizing checks bi-weekly to prevent cost drift.',
      anomalies.length > 0
        ? `Investigate anomaly months (${anomalies.map((anomaly) => anomaly.month).join(', ')}) to avoid repeat spikes.`
        : 'No major anomalies found — continue current spend governance controls.',
      scenarioGrowthRate >= 8
        ? 'High-growth scenario shows rapid cost escalation. Set budget alerts before the next quarter.'
        : 'Scenario impact is moderate. Track monthly variance and adjust commitments every quarter.',
    ];
    return items;
  }, [anomalies, monthlyGrowthRate, scenarioGrowthRate]);

  const exportCsv = () => {
    const lines = ['month,type,cost,confidence'];
    historicalData.forEach((point) => {
      lines.push(`${point.month},historical,${point.total.toFixed(2)},100`);
    });
    forecast.forEach((point) => {
      lines.push(`${point.month},forecast,${point.predicted.toFixed(2)},${point.confidence.toFixed(1)}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cost-forecast.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const yearAheadChange = longTermForecast.predicted - historicalData[historicalData.length - 1].total;
  const trendDirection =
    monthlyGrowthRate > TREND_STABLE_THRESHOLD
      ? 'Upward'
      : monthlyGrowthRate < -TREND_STABLE_THRESHOLD
        ? 'Downward'
        : 'Stable';
  const averageConfidence = (shortTermForecast.confidence + mediumTermForecast.confidence + longTermForecast.confidence) / 3;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <TrendingUp size={30} className="text-primary" />
              <span>Cost Forecasting</span>
            </h1>
            <p className="text-gray-600 mt-1">Predict future cloud spending with simple trend modeling.</p>
          </div>
          <Button onClick={exportCsv} className="flex items-center space-x-2">
            <Download size={16} />
            <span>Export Forecast CSV</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-gray-600">Trend Direction</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{trendDirection}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Monthly Growth Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{(monthlyGrowthRate * 100).toFixed(2)}%</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Estimated 12-Month Change</p>
            <p className={`text-2xl font-bold mt-2 ${yearAheadChange >= 0 ? 'text-danger' : 'text-success'}`}>
              {yearAheadChange >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(yearAheadChange))}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Average Confidence</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{averageConfidence.toFixed(1)}%</p>
          </Card>
        </div>

        <Card>
          <h2 className="text-2xl font-bold mb-6">Historical vs Predicted Cost Trend (12 + 12 Months)</h2>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipValue(value)} />
              <Legend />
              <Line type="monotone" dataKey="historicalCost" stroke="#3B82F6" strokeWidth={2} name="Historical Cost" />
              <Line type="monotone" dataKey="predictedCost" stroke="#10B981" strokeWidth={2} strokeDasharray="6 4" name="Predicted Cost" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-sm text-gray-600">3-Month Forecast</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(shortTermForecast.predicted)}</p>
            <p className="text-sm text-gray-500 mt-1">Confidence: {shortTermForecast.confidence.toFixed(1)}%</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">6-Month Forecast</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(mediumTermForecast.predicted)}</p>
            <p className="text-sm text-gray-500 mt-1">Confidence: {mediumTermForecast.confidence.toFixed(1)}%</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">12-Month Forecast</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(longTermForecast.predicted)}</p>
            <p className="text-sm text-gray-500 mt-1">Confidence: {longTermForecast.confidence.toFixed(1)}%</p>
          </Card>
        </div>

        <Card>
          <h2 className="text-2xl font-bold mb-6">Projected 12-Month Service Breakdown</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={serviceBreakdownData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="service" />
              <YAxis />
              <Tooltip formatter={(value) => formatTooltipValue(value)} />
              <Bar dataKey="cost" fill="#3B82F6" name="Projected Cost" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold mb-4">Anomaly Detection</h2>
          {anomalies.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center text-warning font-semibold">
                <AlertTriangle size={18} className="mr-2" />
                Potential Anomalies Found: {anomalies.length}
              </div>
              {anomalies.map((anomaly) => (
                <div key={anomaly.month} className="p-3 rounded-lg border border-yellow-300 bg-yellow-50">
                  <p className="font-semibold text-gray-900">{anomaly.month}</p>
                  <p className="text-sm text-gray-700">
                    Spend: {formatCurrency(anomaly.total)} ({anomaly.deviation > 0 ? '+' : ''}
                    {anomaly.deviation.toFixed(2)}σ from normal)
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-700">No unusual spending patterns detected in the historical window.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-2xl font-bold mb-4">Scenario Analysis</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="scenario-growth-rate" className="block text-sm font-semibold text-gray-700 mb-2">
                What if monthly spending increases by {scenarioGrowthRate}% each month?
              </label>
              <input
                id="scenario-growth-rate"
                type="range"
                min={MIN_SCENARIO_GROWTH_RATE}
                max={MAX_SCENARIO_GROWTH_RATE}
                value={scenarioGrowthRate}
                onChange={(event) => setScenarioGrowthRate(Number(event.target.value))}
                className="w-full"
              />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scenarioData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatTooltipValue(value)} />
                <Legend />
                <Line type="monotone" dataKey="baseline" stroke="#3B82F6" strokeWidth={2} name="Baseline Forecast" />
                <Line type="monotone" dataKey="scenario" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 4" name="Scenario Forecast" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
          <div className="space-y-3">
            {recommendationItems.map((item) => (
              <div key={item} className="p-4 rounded-lg border border-gray-200 bg-gray-50 flex items-start">
                {monthlyGrowthRate >= 0 ? (
                  <TrendingUp size={18} className="text-primary mt-0.5 mr-2" />
                ) : (
                  <TrendingDown size={18} className="text-success mt-0.5 mr-2" />
                )}
                <p className="text-gray-800">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};
