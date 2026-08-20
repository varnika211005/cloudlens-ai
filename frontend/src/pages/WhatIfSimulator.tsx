import React, { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FlaskConical, DollarSign, TrendingDown } from 'lucide-react';

export const WhatIfSimulator: React.FC = () => {
  const [monthlyCost, setMonthlyCost] = useState(4200);
  const [rightsizingPercent, setRightsizingPercent] = useState(10);
  const [reservedSavingsPercent, setReservedSavingsPercent] = useState(18);

  const scenario = useMemo(() => {
    const rightsizedCost = monthlyCost * (1 - rightsizingPercent / 100);
    const finalCost = rightsizedCost * (1 - reservedSavingsPercent / 100);
    const monthlySavings = monthlyCost - finalCost;
    return {
      projectedMonthly: finalCost,
      monthlySavings,
      yearlySavings: monthlySavings * 12,
    };
  }, [monthlyCost, rightsizingPercent, reservedSavingsPercent]);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <FlaskConical size={32} className="text-primary" />
            <span>What-If Simulator</span>
          </h1>
          <p className="text-gray-600 mt-1">Test cost changes before implementation</p>
        </div>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Monthly Cost ($)</label>
              <input
                type="number"
                min={0}
                value={monthlyCost}
                onChange={(e) => setMonthlyCost(Number(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rightsizing Impact (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={rightsizingPercent}
                onChange={(e) => setRightsizingPercent(Number(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reserved/Commitment Savings (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={reservedSavingsPercent}
                onChange={(e) => setReservedSavingsPercent(Number(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-sm text-gray-600">Projected Monthly Cost</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">${scenario.projectedMonthly.toFixed(2)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 flex items-center space-x-2">
              <TrendingDown size={16} />
              <span>Monthly Savings</span>
            </p>
            <p className="text-3xl font-bold text-success mt-2">${scenario.monthlySavings.toFixed(2)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600 flex items-center space-x-2">
              <DollarSign size={16} />
              <span>Yearly Savings</span>
            </p>
            <p className="text-3xl font-bold text-success mt-2">${scenario.yearlySavings.toFixed(2)}</p>
          </Card>
        </div>

        <Card>
          <h2 className="text-2xl font-bold mb-4">Suggested Experiments</h2>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-gray-200">
              Increase rightsizing by 5% to compare extra savings on compute-heavy workloads.
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              Test commitments at 1-year vs 3-year terms before locking contracts.
            </div>
            <div className="p-4 rounded-lg border border-gray-200">
              Combine with region optimization for a blended savings scenario.
            </div>
          </div>
          <Button className="mt-4">Save Scenario</Button>
        </Card>
      </div>
    </Layout>
  );
};
