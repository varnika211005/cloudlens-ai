import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Alert } from '../components/Alert';
import api from '../services/api';
import { Recommendation } from '../types';
import { Lightbulb, DollarSign, TrendingDown, Zap } from 'lucide-react';

export const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalSavings, setTotalSavings] = useState(0);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const data = await api.getRecommendations();
      setRecommendations(data.recommendations || []);
      setTotalSavings(data.total_potential_savings_monthly || 0);
    } catch (err: any) {
      setError('Failed to load recommendations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800';
    if (priority >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Recommendations</h1>
          <p className="text-gray-600 mt-1">Optimize your cloud costs with AI-driven insights</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {/* Total Savings Card */}
        <Card className="bg-gradient-to-r from-primary to-blue-600 text-white">
          <div className="flex items-center space-x-4">
            <DollarSign size={48} className="opacity-20" />
            <div>
              <p className="text-blue-100">Potential Monthly Savings</p>
              <p className="text-4xl font-bold">${totalSavings.toFixed(2)}</p>
              <p className="text-blue-100 text-sm mt-1">
                From {recommendations.length} recommendations
              </p>
            </div>
          </div>
        </Card>

        {/* Recommendations List */}
        {recommendations.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Lightbulb size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No recommendations yet</p>
              <p className="text-gray-500 text-sm mt-2">Generate recommendations by connecting a cloud provider</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <Card key={rec.id}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{rec.title}</h3>
                    <p className="text-gray-600 mt-2">{rec.description}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ml-4 whitespace-nowrap ${getPriorityColor(rec.priority_score)}`}>
                    Priority {rec.priority_score}/10
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-gray-600 text-sm">Cloud Provider</p>
                    <p className="text-lg font-semibold text-gray-900">{rec.cloud_provider}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm flex items-center space-x-1">
                      <TrendingDown size={16} />
                      <span>Monthly Savings</span>
                    </p>
                    <p className="text-lg font-semibold text-success">
                      ${rec.estimated_monthly_savings.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm flex items-center space-x-1">
                      <Zap size={16} />
                      <span>Yearly Savings</span>
                    </p>
                    <p className="text-lg font-semibold text-success">
                        ${(rec.estimated_monthly_savings * 12).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Action Items:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">
                    {rec.action}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <Button size="sm" variant="success">
                    Mark as Implemented
                  </Button>
                  <Button size="sm" variant="secondary">
                    Learn More
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};