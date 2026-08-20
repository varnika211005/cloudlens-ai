import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Alert } from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Settings as SettingsIcon, Save, Mail, User } from 'lucide-react';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      await api.updateProfile(formData);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await api.changePassword(
        passwordData.old_password,
        passwordData.new_password
      );
      setSuccess('Password changed successfully!');
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <SettingsIcon size={32} className="text-primary" />
            <span>Settings</span>
          </h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {/* Profile Settings */}
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <User size={24} className="text-primary" />
            <h2 className="text-2xl font-bold">Profile Information</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="max-w-md space-y-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />

            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <p className="text-gray-600 text-sm mt-1">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Save size={18} />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </form>
        </Card>

        {/* Password Settings */}
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <Mail size={24} className="text-primary" />
            <h2 className="text-2xl font-bold">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={passwordData.old_password}
              onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              required
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              required
            />

            <Button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <Save size={18} />
              <span>{loading ? 'Updating...' : 'Update Password'}</span>
            </Button>
          </form>
        </Card>

        {/* Preferences */}
        <Card>
          <h2 className="text-2xl font-bold mb-6">Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Email Notifications</p>
                <p className="text-gray-600 text-sm">Receive alerts via email</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Weekly Digest</p>
                <p className="text-gray-600 text-sm">Get weekly cost summary</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Dark Mode</p>
                <p className="text-gray-600 text-sm">Use dark theme (coming soon)</p>
              </div>
              <input type="checkbox" disabled className="w-4 h-4" />
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-2 border-red-200 bg-red-50">
          <h2 className="text-2xl font-bold text-red-900 mb-6">Danger Zone</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Delete Account</p>
                <p className="text-gray-600 text-sm">Permanently delete your account and all data</p>
              </div>
              <Button variant="danger">Delete Account</Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};