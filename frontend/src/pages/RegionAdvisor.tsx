import React, { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { MapPin, TrendingDown } from 'lucide-react';

type RegionOption = {
  code: string;
  name: string;
  monthlyCost: number;
  carbonProfile: 'Low' | 'Medium' | 'High';
};

const regionOptions: RegionOption[] = [
  { code: 'us-east-1', name: 'US East (N. Virginia)', monthlyCost: 420, carbonProfile: 'Medium' },
  { code: 'us-west-2', name: 'US West (Oregon)', monthlyCost: 395, carbonProfile: 'Low' },
  { code: 'eu-west-1', name: 'EU (Ireland)', monthlyCost: 438, carbonProfile: 'Low' },
  { code: 'ap-south-1', name: 'Asia Pacific (Mumbai)', monthlyCost: 465, carbonProfile: 'High' },
  { code: 'eu-north-1', name: 'EU (Stockholm)', monthlyCost: 384, carbonProfile: 'Low' },
];

export const RegionAdvisor: React.FC = () => {
  const [currentRegion, setCurrentRegion] = useState('ap-south-1');

  const current = regionOptions.find((region) => region.code === currentRegion) || regionOptions[0];

  const rankedRegions = useMemo(
    () =>
      regionOptions
        .map((region) => ({
          ...region,
          monthlySavings: current.monthlyCost - region.monthlyCost,
        }))
        .sort((a, b) => b.monthlySavings - a.monthlySavings),
    [current.monthlyCost]
  );

  const bestOption = rankedRegions[0];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <MapPin size={32} className="text-primary" />
            <span>Region Advisor</span>
          </h1>
          <p className="text-gray-600 mt-1">Find cheaper cloud regions for workloads</p>
        </div>

        <Card>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Current Region</label>
          <select
            value={currentRegion}
            onChange={(e) => setCurrentRegion(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {regionOptions.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
          <p className="text-gray-600 mt-3 text-sm">
            Current monthly baseline: <span className="font-semibold text-gray-900">${current.monthlyCost.toFixed(2)}</span>
          </p>
        </Card>

        <Card className="border-l-4 border-green-500">
          <h2 className="text-xl font-bold text-gray-900">Best Savings Opportunity</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="font-semibold">{bestOption.name}</span>
            <span className="text-sm text-gray-600">({bestOption.code})</span>
            <span className="text-green-600 font-bold flex items-center space-x-1">
              <TrendingDown size={16} />
              <span>${bestOption.monthlySavings.toFixed(2)}/month</span>
            </span>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold mb-4">Region Comparison</h2>
          <div className="space-y-3">
            {rankedRegions.map((region) => (
              <div
                key={region.code}
                className="p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{region.name}</p>
                  <p className="text-sm text-gray-600">{region.code}</p>
                </div>
                <div className="text-sm text-gray-700">
                  Cost: <span className="font-semibold">${region.monthlyCost.toFixed(2)}</span>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    region.monthlySavings >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {region.monthlySavings >= 0 ? 'Save' : 'Extra'} ${Math.abs(region.monthlySavings).toFixed(2)}/month
                </div>
                <div className="text-sm text-gray-700">Carbon: {region.carbonProfile}</div>
              </div>
            ))}
          </div>
          <Button className="mt-4">Apply Region Recommendation</Button>
        </Card>
      </div>
    </Layout>
  );
};
