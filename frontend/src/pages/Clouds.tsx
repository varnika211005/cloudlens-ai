import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Alert } from '../components/Alert';
import { Loading } from '../components/Loading';
import api from '../services/api';
import { CloudCredential } from '../types';
import { Cloud, Plus, Trash2, Check, FlaskConical } from 'lucide-react';

const isDemoCloud = (cloud: CloudCredential | any): boolean => {
  return Boolean(
    cloud?.is_mock_mode ||
    cloud?.demo_mode ||
    cloud?.is_demo ||
    cloud?.additional_data?.is_mock ||
    cloud?.additional_data?.demo_mode ||
    cloud?.additional_data?.is_demo
  );
};

const isDemoResponse = (payload: any): boolean => {
  return Boolean(
    payload?.is_mock_mode ||
    payload?.demo_mode ||
    payload?.is_demo ||
    (Array.isArray(payload?.connected_clouds) && payload.connected_clouds.some(isDemoCloud))
  );
};

export const Clouds: React.FC = () => {
  const [clouds, setClouds] = useState<CloudCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    provider: 'AWS',
    aws_access_key: '',
    aws_secret_key: '',
    azure_client_id: '',
    azure_client_secret: '',
    azure_tenant_id: '',
    azure_subscription_id: '',
    gcp_service_account_json: '',
  });

  useEffect(() => {
    fetchClouds();
  }, []);

  const fetchClouds = async () => {
    try {
      setLoading(true);
      const data = await api.listClouds();
      setClouds(data.connected_clouds || []);
      setIsDemoMode(isDemoResponse(data));
    } catch (err: any) {
      setError('Failed to load clouds');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let credentials: Record<string, string> = {};

      if (formData.provider === 'AWS') {
        credentials = {
          aws_access_key: formData.aws_access_key,
          aws_secret_key: formData.aws_secret_key,
        };
      } else if (formData.provider === 'AZURE') {
        credentials = {
          azure_client_id: formData.azure_client_id,
          azure_client_secret: formData.azure_client_secret,
          azure_tenant_id: formData.azure_tenant_id,
          azure_subscription_id: formData.azure_subscription_id,
        };
      } else if (formData.provider === 'GCP') {
        credentials = {
          gcp_service_account_json: formData.gcp_service_account_json,
        };
      }

      await api.connectCloud(formData.provider, credentials);

      setSuccess('Cloud connected successfully!');
      setFormData({
        provider: 'AWS',
        aws_access_key: '',
        aws_secret_key: '',
        azure_client_id: '',
        azure_client_secret: '',
        azure_tenant_id: '',
        azure_subscription_id: '',
        gcp_service_account_json: '',
      });
      setShowForm(false);
      fetchClouds();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect cloud');
    }
  };

  const handleDisconnect = async (provider: string) => {
    if (!window.confirm(`Disconnect ${provider}?`)) return;

    try {
      await api.disconnectCloud(provider);
      setSuccess(`${provider} disconnected`);
      fetchClouds();
    } catch (err: any) {
      setError('Failed to disconnect');
    }
  };

  const handleLoadSampleAws = async () => {
    try {
      setSampleLoading(true);
      setError('');
      setSuccess('');
      await api.connectCloud('AWS', {
        aws_access_key: 'demo-access-key',
        aws_secret_key: 'demo-secret-key',
      });
      setSuccess('Sample AWS account loaded successfully!');
      await fetchClouds();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load sample AWS account');
    } finally {
      setSampleLoading(false);
    }
  };

  if (loading) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cloud Providers</h1>
            <p className="text-gray-600 mt-1">Connect and manage your cloud accounts</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2">
            <Plus size={20} />
            <span>Connect Cloud</span>
          </Button>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {isDemoMode && (
          <Alert
            type="info"
            message={
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <FlaskConical size={16} />
                  <span className="font-semibold">Demo mode active: connected providers may be sample accounts.</span>
                </div>
                <Button onClick={handleLoadSampleAws} disabled={sampleLoading} className="w-full md:w-auto">
                  {sampleLoading ? 'Loading sample AWS account...' : 'Load sample AWS account'}
                </Button>
              </div>
            }
          />
        )}

        {/* Connection Form */}
        {showForm && (
          <Card>
            <h2 className="text-2xl font-bold mb-6">Connect Cloud Provider</h2>

            <form onSubmit={handleConnect} className="max-w-md">
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Provider</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="AWS">Amazon Web Services (AWS)</option>
                  <option value="AZURE">Microsoft Azure</option>
                  <option value="GCP">Google Cloud Platform</option>
                </select>
              </div>

              {formData.provider === 'AWS' && (
                <>
                  <Input
                    label="AWS Access Key ID"
                    placeholder="AKIA..."
                    value={formData.aws_access_key}
                    onChange={(e) => setFormData({ ...formData, aws_access_key: e.target.value })}
                    required
                  />

                  <Input
                    label="AWS Secret Access Key"
                    type="password"
                    placeholder="••••••••••••••••••••••"
                    value={formData.aws_secret_key}
                    onChange={(e) => setFormData({ ...formData, aws_secret_key: e.target.value })}
                    required
                  />
                </>
              )}

              {formData.provider === 'AZURE' && (
                <>
                  <Input
                    label="Client ID"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={formData.azure_client_id}
                    onChange={(e) => setFormData({ ...formData, azure_client_id: e.target.value })}
                    required
                  />

                  <Input
                    label="Client Secret"
                    type="password"
                    placeholder="••••••••••••••••••••••"
                    value={formData.azure_client_secret}
                    onChange={(e) => setFormData({ ...formData, azure_client_secret: e.target.value })}
                    required
                  />

                  <Input
                    label="Tenant ID"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={formData.azure_tenant_id}
                    onChange={(e) => setFormData({ ...formData, azure_tenant_id: e.target.value })}
                    required
                  />

                  <Input
                    label="Subscription ID"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={formData.azure_subscription_id}
                    onChange={(e) => setFormData({ ...formData, azure_subscription_id: e.target.value })}
                    required
                  />
                </>
              )}

              {formData.provider === 'GCP' && (
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Service Account JSON
                  </label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    rows={6}
                    placeholder='Paste your service account JSON here...'
                    value={formData.gcp_service_account_json}
                    onChange={(e) => setFormData({ ...formData, gcp_service_account_json: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="submit">Connect</Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Connected Clouds */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
            <Cloud size={24} className="text-primary" />
            <span>Connected Providers</span>
          </h2>

          {clouds.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <Cloud size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No clouds connected yet</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clouds.map((cloud) => (
                <Card key={cloud.id}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cloud.cloud_provider_display}
                      </h3>
                      <p className="text-sm text-gray-600">{cloud.cloud_provider}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      cloud.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {cloud.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  {isDemoCloud(cloud) && (
                    <div className="mb-4">
                      <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                        Demo / Sample account
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 mb-4 text-sm">
                    <p className="text-gray-600">
                      <span className="font-semibold">Verified:</span>{' '}
                      {cloud.is_verified ? (
                        <span className="text-success flex items-center">
                          <Check size={16} className="mr-1" /> Yes
                        </span>
                      ) : (
                        <span className="text-warning">Pending</span>
                      )}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-semibold">Connected:</span>{' '}
                      {new Date(cloud.connected_at).toLocaleDateString()}
                    </p>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDisconnect(cloud.cloud_provider)}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Trash2 size={16} />
                    <span>Disconnect</span>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
