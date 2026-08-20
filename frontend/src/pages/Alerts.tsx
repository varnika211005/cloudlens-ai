import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { Alert } from '../components/Alert';
import api from '../services/api';
import { AlertRule } from '../types';
import { Bell, Plus, Trash2, Power } from 'lucide-react';

export const Alerts: React.FC = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    alert_type: 'COST_THRESHOLD',
    cloud_provider: 'AWS',
    threshold_value: 100,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await api.listAlertRules();
      setRules(data.rules || []);
    } catch (err: any) {
      setError('Failed to load alert rules');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.createAlertRule(formData);
      setSuccess('Alert rule created successfully!');
      setFormData({
        name: '',
        alert_type: 'COST_THRESHOLD',
        cloud_provider: 'AWS',
        threshold_value: 100,
      });
      setShowForm(false);
      fetchRules();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create rule');
    }
  };

  const handleToggleRule = async (ruleId: number, currentStatus: boolean) => {
    try {
      setTogglingId(ruleId);
      // Update local state optimistically
      setRules(rules.map(r => 
        r.id === ruleId ? { ...r, is_active: !currentStatus } : r
      ));
      setSuccess(`Rule ${!currentStatus ? 'enabled' : 'disabled'}`);
      // In a real app, call API: await api.toggleAlertRule(ruleId);
    } catch (err: any) {
      setError('Failed to toggle rule');
      fetchRules(); // Revert on error
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!window.confirm('Delete this alert rule?')) return;

    try {
      // In a real app: await api.deleteAlertRule(ruleId);
      setRules(rules.filter(r => r.id !== ruleId));
      setSuccess('Rule deleted');
    } catch (err: any) {
      setError('Failed to delete rule');
    }
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alert Rules</h1>
            <p className="text-gray-600 mt-1">Set up notifications for cost anomalies</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2">
            <Plus size={20} />
            <span>New Rule</span>
          </Button>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {/* Create Rule Form */}
        {showForm && (
          <Card>
            <h2 className="text-2xl font-bold mb-6">Create Alert Rule</h2>

            <form onSubmit={handleCreateRule} className="max-w-md space-y-4">
              <Input
                label="Rule Name"
                placeholder="High cost alert"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Alert Type</label>
                <select
                  value={formData.alert_type}
                  onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="COST_THRESHOLD">Cost Threshold</option>
                  <option value="ANOMALY">Cost Anomaly</option>
                  <option value="BUDGET">Budget Exceeded</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Cloud Provider</label>
                <select
                  value={formData.cloud_provider}
                  onChange={(e) => setFormData({ ...formData, cloud_provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="AWS">AWS</option>
                  <option value="AZURE">Azure</option>
                  <option value="GCP">GCP</option>
                </select>
              </div>

              <Input
                label="Threshold ($)"
                type="number"
                placeholder="100"
                value={formData.threshold_value.toString()}
                onChange={(e) => setFormData({ ...formData, threshold_value: parseFloat(e.target.value) })}
                required
              />

              <div className="flex space-x-3">
                <Button type="submit">Create Rule</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Alert Rules List */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
            <Bell size={24} className="text-primary" />
            <span>Active Rules ({rules.filter(r => r.is_active).length})</span>
          </h2>

          {rules.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Bell size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No alert rules yet</p>
                <p className="text-gray-500 text-sm mt-2">Create your first alert rule to monitor costs</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{rule.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          rule.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.is_active ? '● Active' : '○ Inactive'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-gray-600 text-xs uppercase font-semibold">Type</p>
                          <p className="font-semibold text-gray-900 mt-1">{rule.alert_type}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs uppercase font-semibold">Provider</p>
                          <p className="font-semibold text-gray-900 mt-1">{rule.cloud_provider}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 text-xs uppercase font-semibold">Threshold</p>
                          <p className="font-semibold text-gray-900 mt-1">${rule.threshold_value}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleRule(rule.id, rule.is_active)}
                        disabled={togglingId === rule.id}
                        className={`p-2 rounded-lg transition ${
                          rule.is_active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        } disabled:opacity-50`}
                        title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                      >
                        <Power size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete rule"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};