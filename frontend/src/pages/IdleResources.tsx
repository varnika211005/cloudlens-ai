import React, { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { AlertTriangle, DollarSign, Server, Database, HardDrive } from 'lucide-react';

type ResourceType = 'EC2' | 'RDS' | 'Storage';

interface IdleResource {
  id: string;
  name: string;
  type: ResourceType;
  monthlyCost: number;
  idleDurationDays: number;
  cpuPercent: number;
  networkMbPerHour: number;
}

const idleThresholds = {
  cpuPercent: 5,
  networkMbPerHour: 1,
};

const idleResources: IdleResource[] = [
  { id: 'ec2-01', name: 'prod-web-t3-large', type: 'EC2', monthlyCost: 182.4, idleDurationDays: 28, cpuPercent: 1.9, networkMbPerHour: 0.4 },
  { id: 'ec2-02', name: 'dev-worker-t3-medium', type: 'EC2', monthlyCost: 74.88, idleDurationDays: 19, cpuPercent: 3.1, networkMbPerHour: 0.7 },
  { id: 'rds-01', name: 'legacy-reporting-db', type: 'RDS', monthlyCost: 296.3, idleDurationDays: 34, cpuPercent: 2.4, networkMbPerHour: 0.2 },
  { id: 's3-01', name: 'archive-access-logs', type: 'Storage', monthlyCost: 42.75, idleDurationDays: 92, cpuPercent: 0, networkMbPerHour: 0.1 },
  { id: 'ebs-01', name: 'orphaned-ebs-volume', type: 'Storage', monthlyCost: 58.2, idleDurationDays: 41, cpuPercent: 0, networkMbPerHour: 0 },
];

export const IdleResources: React.FC = () => {
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'All' | ResourceType>('All');
  const [sortBy, setSortBy] = useState<'cost' | 'idleDuration'>('cost');
  const [message, setMessage] = useState('');

  const filteredResources = useMemo(() => {
    const resources = idleResources.filter((resource) => (
      resourceTypeFilter === 'All' ? true : resource.type === resourceTypeFilter
    ));

    return resources.sort((a, b) => (
      sortBy === 'cost'
        ? b.monthlyCost - a.monthlyCost
        : b.idleDurationDays - a.idleDurationDays
    ));
  }, [resourceTypeFilter, sortBy]);

  const totalSavings = filteredResources.reduce((acc, resource) => acc + resource.monthlyCost, 0);

  const getResourceIcon = (type: ResourceType) => {
    if (type === 'EC2') return <Server size={18} className="text-primary" />;
    if (type === 'RDS') return <Database size={18} className="text-primary" />;
    return <HardDrive size={18} className="text-primary" />;
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <AlertTriangle size={32} className="text-warning" />
            <span>Idle Resources</span>
          </h1>
          <p className="text-gray-600 mt-1">Identify underutilized resources and reduce unnecessary spend</p>
        </div>

        {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}

        <Card className="bg-gradient-to-r from-primary to-blue-600 text-white">
          <div className="flex items-center space-x-4">
            <DollarSign size={48} className="opacity-20" />
            <div>
              <p className="text-blue-100">Potential Monthly Savings</p>
              <p className="text-4xl font-bold">${totalSavings.toFixed(2)}</p>
              <p className="text-blue-100 text-sm mt-1">
                If {filteredResources.length} filtered idle resources are terminated
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Idle Detection Logic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">CPU utilization threshold</p>
              <p className="text-lg font-semibold text-gray-900">&lt; {idleThresholds.cpuPercent}% average</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">Network threshold</p>
              <p className="text-lg font-semibold text-gray-900">&lt; {idleThresholds.networkMbPerHour} MB/hour</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Filter by Resource Type</label>
              <select
                value={resourceTypeFilter}
                onChange={(e) => setResourceTypeFilter(e.target.value as 'All' | ResourceType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All</option>
                <option value="EC2">EC2</option>
                <option value="RDS">RDS</option>
                <option value="Storage">Storage</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'cost' | 'idleDuration')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="cost">Highest Cost</option>
                <option value="idleDuration">Longest Idle Duration</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {filteredResources.map((resource) => (
            <Card key={resource.id}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getResourceIcon(resource.type)}
                    <h3 className="text-xl font-bold text-gray-900">{resource.name}</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-gray-600 text-sm">Type</p>
                      <p className="text-gray-900 font-semibold">{resource.type}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Monthly Cost</p>
                      <p className="text-gray-900 font-semibold">${resource.monthlyCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Idle Duration</p>
                      <p className="text-gray-900 font-semibold">{resource.idleDurationDays} days</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Potential Savings</p>
                      <p className="text-success font-semibold">${resource.monthlyCost.toFixed(2)}/month</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    CPU: {resource.cpuPercent}% • Network: {resource.networkMbPerHour} MB/hour
                  </p>
                </div>

                <div className="flex md:flex-col gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setMessage(`Termination initiated for ${resource.name}`)}
                  >
                    Terminate
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setMessage(`Optimization workflow started for ${resource.name}`)}
                  >
                    Optimize
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};
