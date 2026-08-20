import React, { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Download, FileText, Mail, CalendarClock } from 'lucide-react';

interface MonthlySummary {
  month: string;
  total: number;
  budget: number;
}

const monthlySummary: MonthlySummary[] = [
  { month: 'Jan 26', total: 11250, budget: 11000 },
  { month: 'Feb 26', total: 11820, budget: 11500 },
  { month: 'Mar 26', total: 12140, budget: 12000 },
  { month: 'Apr 26', total: 12950, budget: 12300 },
];

const serviceBreakdown = [
  { name: 'EC2', cost: 5240 },
  { name: 'RDS', cost: 2760 },
  { name: 'Storage', cost: 2140 },
  { name: 'Network', cost: 1620 },
];

const regionBreakdown = [
  { name: 'us-east-1', cost: 4860 },
  { name: 'us-west-2', cost: 3650 },
  { name: 'eu-west-1', cost: 2720 },
  { name: 'ap-southeast-1', cost: 1870 },
];

const tagBreakdown = [
  { name: 'production', cost: 7280 },
  { name: 'staging', cost: 2890 },
  { name: 'dev', cost: 1780 },
  { name: 'shared', cost: 1150 },
];

const topSpendingItems = [
  { resource: 'prod-analytics-cluster', cost: 1640, owner: 'Data Platform' },
  { resource: 'core-payments-rds', cost: 1320, owner: 'Payments' },
  { resource: 'global-cdn-egress', cost: 980, owner: 'Web Team' },
  { resource: 'nightly-etl-batch', cost: 740, owner: 'Data Platform' },
];

const optimizationRecommendations = [
  'Move steady EC2 workloads to Savings Plans (est. $430/month).',
  'Enable S3 lifecycle tiering for archival buckets (est. $120/month).',
  'Rightsize over-provisioned RDS instances in staging (est. $210/month).',
];

const anomalies = [
  { month: 'Apr 26', change: 6.7, reason: 'Unexpected spike in analytics compute usage' },
  { month: 'Feb 26', change: 3.9, reason: 'Regional data transfer increase for migration' },
];

const reportHistory = [
  { id: 'RPT-2201', generatedAt: '2026-04-12 09:00 UTC', range: 'Mar 01 - Mar 31', status: 'Delivered' },
  { id: 'RPT-2200', generatedAt: '2026-04-05 09:00 UTC', range: 'Feb 01 - Feb 28', status: 'Delivered' },
  { id: 'RPT-2199', generatedAt: '2026-03-29 09:00 UTC', range: 'Jan 01 - Jan 31', status: 'Archived' },
];

const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US')}`;
const escapePdfText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const createSimplePdf = (lines: string[]) => {
  const contentStream = [
    'BT',
    '/F1 12 Tf',
    '50 790 Td',
    '16 TL',
    ...lines.map((line, index) =>
      index === 0 ? `(${escapePdfText(line)}) Tj` : `T* (${escapePdfText(line)}) Tj`
    ),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  const header = '%PDF-1.4\n';
  const offsets: number[] = [0];
  let body = '';
  let currentOffset = header.length;

  objects.forEach((object) => {
    offsets.push(currentOffset);
    body += object;
    currentOffset += object.length;
  });

  const xrefOffset = currentOffset;
  const xrefEntries = offsets
    .map((offset, index) =>
      index === 0 ? '0000000000 65535 f ' : `${offset.toString().padStart(10, '0')} 00000 n `
    )
    .join('\n');

  const trailer = [
    `xref\n0 ${offsets.length}`,
    xrefEntries,
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF',
  ].join('\n');

  return `${header}${body}${trailer}`;
};

export const ReportGenerator: React.FC = () => {
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-04-30');
  const [metric, setMetric] = useState('total_cost');
  const [providerFilter, setProviderFilter] = useState('All');
  const [frequency, setFrequency] = useState('monthly');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailRecipients, setEmailRecipients] = useState('finops@cloudlens.ai, ops@cloudlens.ai');
  const [includeTopItems, setIncludeTopItems] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [includeAnomalies, setIncludeAnomalies] = useState(true);
  const [message, setMessage] = useState('');

  const growthRate = useMemo(() => {
    const first = monthlySummary[0].total;
    const last = monthlySummary[monthlySummary.length - 1].total;
    return ((last - first) / first) * 100;
  }, []);

  const budgetVariance = useMemo(
    () =>
      monthlySummary.map((row) => ({
        month: row.month,
        actual: row.total,
        budget: row.budget,
        variance: row.total - row.budget,
      })),
    []
  );

  const previewSections = useMemo(() => {
    const sections = [
      'Monthly cost summary',
      'Cost breakdown (service, region, tag)',
      'Budget vs actual comparison',
      'Trend analysis',
    ];
    if (includeTopItems) sections.push('Top spending items');
    if (includeRecommendations) sections.push('Optimization recommendations');
    if (includeAnomalies) sections.push('Anomalies detected');
    return sections;
  }, [includeAnomalies, includeRecommendations, includeTopItems]);

  const handleDownloadPdf = () => {
    const reportContent = [
      'CloudLens AI Cost Analysis Report',
      `Date Range: ${startDate} to ${endDate}`,
      `Metric: ${metric}`,
      `Provider filter: ${providerFilter}`,
      `Scheduled: ${frequency}`,
      `Sections: ${previewSections.join(', ')}`,
      `Growth rate: ${growthRate.toFixed(2)}%`,
    ];

    const blob = new Blob([createSimplePdf(reportContent)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cloud-cost-report.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage('Report generated and download started.');
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <FileText size={30} className="text-primary" />
              <span>PDF Report Generator</span>
            </h1>
            <p className="text-gray-600 mt-1">Create downloadable cloud cost reports with delivery controls.</p>
          </div>
          <Button onClick={handleDownloadPdf} className="flex items-center space-x-2">
            <Download size={16} />
            <span>Download as PDF</span>
          </Button>
        </div>

        {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1">
            <h2 className="text-xl font-bold mb-4">Report Configuration</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="start-date" className="block text-sm font-semibold text-gray-700 mb-1">Start date</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-semibold text-gray-700 mb-1">End date</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="metric-select" className="block text-sm font-semibold text-gray-700 mb-1">Metric selection</label>
                <select
                  id="metric-select"
                  value={metric}
                  onChange={(event) => setMetric(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="total_cost">Total cost</option>
                  <option value="amortized_cost">Amortized cost</option>
                  <option value="usage_cost">Usage cost</option>
                </select>
              </div>
              <div>
                <label htmlFor="provider-filter" className="block text-sm font-semibold text-gray-700 mb-1">Cloud filter</label>
                <select
                  id="provider-filter"
                  value={providerFilter}
                  onChange={(event) => setProviderFilter(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="All">All Providers</option>
                  <option value="AWS">AWS</option>
                  <option value="Azure">Azure</option>
                  <option value="GCP">GCP</option>
                </select>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Sections to include</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={includeTopItems} onChange={() => setIncludeTopItems((value) => !value)} />
                    <span>Top spending items</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={includeRecommendations} onChange={() => setIncludeRecommendations((value) => !value)} />
                    <span>Optimization recommendations</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={includeAnomalies} onChange={() => setIncludeAnomalies((value) => !value)} />
                    <span>Anomalies detected</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          <Card className="xl:col-span-2">
            <h2 className="text-xl font-bold mb-4">Preview of Report Contents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewSections.map((section) => (
                <div key={section} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="font-semibold text-gray-900">{section}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-xl font-bold mb-4">Monthly Cost Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-gray-600 border-b">
                <tr>
                  <th className="py-2">Month</th>
                  <th className="py-2">Actual</th>
                  <th className="py-2">Budget</th>
                  <th className="py-2">Variance</th>
                </tr>
              </thead>
              <tbody>
                {budgetVariance.map((row) => (
                  <tr key={row.month} className="border-b last:border-b-0">
                    <td className="py-3">{row.month}</td>
                    <td className="py-3">{formatCurrency(row.actual)}</td>
                    <td className="py-3">{formatCurrency(row.budget)}</td>
                    <td className={`py-3 font-semibold ${row.variance > 0 ? 'text-danger' : 'text-success'}`}>
                      {row.variance > 0 ? '+' : row.variance < 0 ? '-' : ''}
                      {formatCurrency(Math.abs(row.variance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card>
            <h2 className="text-lg font-bold mb-3">By Service</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={serviceBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="cost" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h2 className="text-lg font-bold mb-3">By Region</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={regionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="cost" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h2 className="text-lg font-bold mb-3">By Tag</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tagBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="cost" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {includeTopItems && (
          <Card>
            <h2 className="text-xl font-bold mb-4">Top Spending Items</h2>
            <div className="space-y-3">
              {topSpendingItems.map((item) => (
                <div key={item.resource} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{item.resource}</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(item.cost)}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.owner}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {includeRecommendations && (
          <Card>
            <h2 className="text-xl font-bold mb-4">Optimization Recommendations</h2>
            <ul className="space-y-3">
              {optimizationRecommendations.map((recommendation) => (
                <li key={recommendation} className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-800">
                  {recommendation}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-bold mb-4">Trend Analysis</h2>
            <p className="text-gray-600">Growth rate across selected range</p>
            <p className={`text-4xl font-bold mt-3 ${growthRate > 0 ? 'text-danger' : 'text-success'}`}>
              {growthRate > 0 ? '+' : ''}
              {growthRate.toFixed(2)}%
            </p>
          </Card>
          <Card>
            <h2 className="text-xl font-bold mb-4">Budget vs Actual Comparison</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={budgetVariance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
                <Bar dataKey="budget" fill="#9CA3AF" name="Budget" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {includeAnomalies && (
          <Card>
            <h2 className="text-xl font-bold mb-4">Anomalies Detected</h2>
            <div className="space-y-3">
              {anomalies.map((item) => (
                <div key={item.month} className="p-4 rounded-lg border border-yellow-300 bg-yellow-50">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{item.month}</p>
                    <p className="text-warning font-semibold">+{item.change.toFixed(1)}%</p>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{item.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CalendarClock size={20} className="text-primary" />
              Schedule Report Generation
            </h2>
            <label htmlFor="report-frequency" className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
            <select
              id="report-frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-sm text-gray-600 mt-3">
              Reports will be generated automatically on your selected cadence.
            </p>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Mail size={20} className="text-primary" />
              Email Delivery Options
            </h2>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={() => setEmailEnabled((value) => !value)}
              />
              <span>Enable email delivery</span>
            </label>
            <label htmlFor="email-recipients" className="block text-sm font-semibold text-gray-700 mb-2">Recipients</label>
            <input
              id="email-recipients"
              type="text"
              value={emailRecipients}
              onChange={(event) => setEmailRecipients(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={!emailEnabled}
            />
          </Card>
        </div>

        <Card>
          <h2 className="text-xl font-bold mb-4">Report History / Archive</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-gray-600 border-b">
                <tr>
                  <th className="py-2">Report ID</th>
                  <th className="py-2">Generated At</th>
                  <th className="py-2">Date Range</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportHistory.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-3 font-semibold text-gray-900">{row.id}</td>
                    <td className="py-3 text-gray-700">{row.generatedAt}</td>
                    <td className="py-3 text-gray-700">{row.range}</td>
                    <td className="py-3 text-gray-700">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};
