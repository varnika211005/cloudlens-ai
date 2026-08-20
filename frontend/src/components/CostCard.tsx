import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CostCardProps {
  title: string;
  amount: number;
  currency?: string;
  trend?: 'up' | 'down' | 'stable';
  trendPercent?: number;
}

export const CostCard: React.FC<CostCardProps> = ({
  title,
  amount,
  currency = 'USD',
  trend,
  trendPercent,
}) => {
  return (
    <Card>
      <h3 className="text-gray-600 text-sm font-semibold mb-2">{title}</h3>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">
            ${amount.toFixed(2)}
          </p>
          <p className="text-gray-500 text-sm">{currency}</p>
        </div>
        {trend && trendPercent !== undefined && (
          <div className={`flex items-center space-x-1 ${trend === 'up' ? 'text-danger' : 'text-success'}`}>
            {trend === 'up' ? (
              <TrendingUp size={20} />
            ) : (
              <TrendingDown size={20} />
            )}
            <span className="font-semibold">{trendPercent}%</span>
          </div>
        )}
      </div>
    </Card>
  );
};