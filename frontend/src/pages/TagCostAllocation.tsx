import React, { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Download, Plus, Tag, Trash2, Edit3, Sparkles } from 'lucide-react';

interface TagItem {
  id: string;
  name: string;
  type: 'department' | 'project' | 'environment' | 'cost-center';
  budget: number;
}

interface ResourceItem {
  id: string;
  name: string;
  service: string;
  monthlyCost: number;
  region: string;
  tagId: string | null;
}

interface ChargebackRule {
  id: string;
  scope: string;
  strategy: string;
  owner: string;
}

const TAG_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const initialTags: TagItem[] = [
  { id: 'tag-eng', name: 'engineering', type: 'department', budget: 6000 },
  { id: 'tag-payments', name: 'payments-api', type: 'project', budget: 4200 },
  { id: 'tag-prod', name: 'production', type: 'environment', budget: 9000 },
  { id: 'tag-cc101', name: 'CC-101', type: 'cost-center', budget: 5000 },
];

const initialResources: ResourceItem[] = [
  { id: 'res-1', name: 'ec2-prod-web-1', service: 'EC2', monthlyCost: 1280, region: 'us-east-1', tagId: 'tag-prod' },
  { id: 'res-2', name: 'rds-payments-main', service: 'RDS', monthlyCost: 1740, region: 'us-east-1', tagId: 'tag-payments' },
  { id: 'res-3', name: 's3-engineering-artifacts', service: 'S3', monthlyCost: 520, region: 'us-west-2', tagId: 'tag-eng' },
  { id: 'res-4', name: 'eks-platform-core', service: 'EKS', monthlyCost: 2140, region: 'us-west-2', tagId: 'tag-cc101' },
  { id: 'res-5', name: 'lambda-dev-cron', service: 'Lambda', monthlyCost: 220, region: 'eu-west-1', tagId: null },
  { id: 'res-6', name: 'ebs-orphan-volume-42', service: 'EBS', monthlyCost: 380, region: 'us-east-1', tagId: null },
  { id: 'res-7', name: 'ec2-app-staging', service: 'EC2', monthlyCost: 740, region: 'ap-southeast-1', tagId: 'tag-eng' },
];

const monthlyTrend = [
  { month: 'Jan', 'tag-eng': 980, 'tag-payments': 1400, 'tag-prod': 1840, 'tag-cc101': 1620 },
  { month: 'Feb', 'tag-eng': 1050, 'tag-payments': 1540, 'tag-prod': 1980, 'tag-cc101': 1740 },
  { month: 'Mar', 'tag-eng': 1120, 'tag-payments': 1600, 'tag-prod': 2090, 'tag-cc101': 1830 },
  { month: 'Apr', 'tag-eng': 1260, 'tag-payments': 1710, 'tag-prod': 2230, 'tag-cc101': 1970 },
  { month: 'May', 'tag-eng': 1180, 'tag-payments': 1660, 'tag-prod': 2160, 'tag-cc101': 1910 },
  { month: 'Jun', 'tag-eng': 1260, 'tag-payments': 1740, 'tag-prod': 2310, 'tag-cc101': 2030 },
];

const chargebackRules: ChargebackRule[] = [
  { id: 'rule-1', scope: 'Department', strategy: 'Split shared network costs by usage %', owner: 'FinOps' },
  { id: 'rule-2', scope: 'Project', strategy: 'Allocate platform spend by pod-hours', owner: 'Platform Team' },
  { id: 'rule-3', scope: 'Environment', strategy: 'Charge production storage at full rate, non-prod at 70%', owner: 'Cloud Ops' },
];

const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const TagCostAllocation: React.FC = () => {
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [resources, setResources] = useState<ResourceItem[]>(initialResources);
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [tagSearch, setTagSearch] = useState('');
  const [bulkTagId, setBulkTagId] = useState('');
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const [draftTagName, setDraftTagName] = useState('');
  const [draftTagType, setDraftTagType] = useState<TagItem['type']>('department');
  const [draftTagBudget, setDraftTagBudget] = useState('3000');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  const tagCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    resources.forEach((resource) => {
      if (!resource.tagId) return;
      map[resource.tagId] = (map[resource.tagId] || 0) + resource.monthlyCost;
    });
    return map;
  }, [resources]);

  const tagCosts = useMemo(
    () =>
      tags
        .map((tag) => ({
          ...tag,
          totalCost: tagCostMap[tag.id] || 0,
          resourceCount: resources.filter((resource) => resource.tagId === tag.id).length,
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
    [resources, tagCostMap, tags]
  );

  const filteredTags = useMemo(
    () => tagCosts.filter((tag) => tag.name.toLowerCase().includes(tagSearch.toLowerCase().trim())),
    [tagCosts, tagSearch]
  );

  const filteredResources = useMemo(() => {
    if (selectedTagId === 'untagged') return resources.filter((resource) => resource.tagId === null);
    if (selectedTagId === 'all') return resources;
    return resources.filter((resource) => resource.tagId === selectedTagId);
  }, [resources, selectedTagId]);

  const groupedResources = useMemo(
    () =>
      tags.map((tag) => ({
        tag,
        resources: resources.filter((resource) => resource.tagId === tag.id),
      })),
    [resources, tags]
  );

  const untaggedResources = useMemo(() => resources.filter((resource) => resource.tagId === null), [resources]);
  const untaggedCost = useMemo(
    () => untaggedResources.reduce((sum, resource) => sum + resource.monthlyCost, 0),
    [untaggedResources]
  );
  const topTag = tagCosts[0];

  const chartData = useMemo(
    () =>
      tagCosts
        .filter((tag) => tag.totalCost > 0)
        .map((tag) => ({ name: tag.name, value: Number(tag.totalCost.toFixed(2)) })),
    [tagCosts]
  );

  const exportCsv = () => {
    const lines = ['tag,type,total_cost,resource_count,budget'];
    tagCosts.forEach((tag) => {
      lines.push(`${tag.name},${tag.type},${tag.totalCost.toFixed(2)},${tag.resourceCount},${tag.budget.toFixed(2)}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tag-cost-allocation.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage('Tag cost report exported as CSV.');
  };

  const resetTagForm = () => {
    setDraftTagName('');
    setDraftTagType('department');
    setDraftTagBudget('3000');
    setEditingTagId(null);
  };

  const handleSaveTag = () => {
    if (!draftTagName.trim()) {
      setMessage('Tag name is required.');
      return;
    }

    const parsedBudget = Number(draftTagBudget);
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setMessage('Budget must be a valid non-negative number.');
      return;
    }

    if (editingTagId) {
      setTags((current) =>
        current.map((tag) =>
          tag.id === editingTagId
            ? {
                ...tag,
                name: draftTagName.trim(),
                type: draftTagType,
                budget: parsedBudget,
              }
            : tag
        )
      );
      setMessage(`Updated tag "${draftTagName.trim()}".`);
    } else {
      const newTag: TagItem = {
        id: `tag-${Date.now()}`,
        name: draftTagName.trim(),
        type: draftTagType,
        budget: parsedBudget,
      };
      setTags((current) => [...current, newTag]);
      setMessage(`Added tag "${newTag.name}".`);
    }

    resetTagForm();
  };

  const handleEditTag = (tag: TagItem) => {
    setEditingTagId(tag.id);
    setDraftTagName(tag.name);
    setDraftTagType(tag.type);
    setDraftTagBudget(tag.budget.toString());
  };

  const handleDeleteTag = (tagId: string) => {
    const tag = tags.find((item) => item.id === tagId);
    if (!tag) return;

    setTags((current) => current.filter((item) => item.id !== tagId));
    setResources((current) => current.map((resource) => (resource.tagId === tagId ? { ...resource, tagId: null } : resource)));
    if (selectedTagId === tagId) {
      setSelectedTagId('all');
    }
    setMessage(`Deleted tag "${tag.name}" and moved its resources to untagged.`);
  };

  const handleToggleResourceSelection = (resourceId: string) => {
    setSelectedResourceIds((current) =>
      current.includes(resourceId) ? current.filter((id) => id !== resourceId) : [...current, resourceId]
    );
  };

  const handleBulkApplyTag = () => {
    if (!bulkTagId || selectedResourceIds.length === 0) {
      setMessage('Select at least one resource and a tag for bulk tagging.');
      return;
    }

    setResources((current) =>
      current.map((resource) =>
        selectedResourceIds.includes(resource.id) ? { ...resource, tagId: bulkTagId } : resource
      )
    );
    setMessage(`Applied tag to ${selectedResourceIds.length} selected resource(s).`);
    setSelectedResourceIds([]);
  };

  const recommendationText = (resourceName: string) => {
    const lower = resourceName.toLowerCase();
    if (lower.includes('lambda')) return 'Recommend environment:dev and project:automation';
    if (lower.includes('ebs') || lower.includes('volume')) return 'Recommend department:platform and cost-center:CC-101';
    return 'Recommend environment:staging and project:shared-services';
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <Tag size={30} className="text-primary" />
              <span>Tag-Based Cost Allocation</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Analyze cloud costs by department, project, environment, and cost center tags.
            </p>
          </div>
          <Button onClick={exportCsv} className="flex items-center space-x-2">
            <Download size={16} />
            <span>Export Tag Costs CSV</span>
          </Button>
        </div>

        {message && <Alert type="info" message={message} onClose={() => setMessage('')} />}

        {untaggedResources.length > 0 && (
          <Alert
            type="warning"
            message={
              <div>
                <p className="font-semibold">Untagged resources detected: {untaggedResources.length}</p>
                <p className="text-sm mt-1">
                  Untagged monthly cost: <span className="font-semibold">{formatCurrency(untaggedCost)}</span>
                </p>
              </div>
            }
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-gray-600">Total Tags</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{tags.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Top Cost Tag</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{topTag ? topTag.name : 'N/A'}</p>
            {topTag && <p className="text-sm text-gray-500 mt-1">{formatCurrency(topTag.totalCost)}</p>}
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Tagged Resource Cost</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(resources.reduce((sum, r) => sum + r.monthlyCost, 0) - untaggedCost)}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-600">Untagged Resource Cost</p>
            <p className="text-2xl font-bold text-danger mt-2">{formatCurrency(untaggedCost)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label htmlFor="search-tags" className="block text-sm font-semibold text-gray-700 mb-1">Search tags</label>
                <input
                  id="search-tags"
                  type="text"
                  value={tagSearch}
                  onChange={(event) => setTagSearch(event.target.value)}
                  placeholder="Search by tag name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:w-60">
                <label htmlFor="filter-tag" className="block text-sm font-semibold text-gray-700 mb-1">Filter resources by tag</label>
                <select
                  id="filter-tag"
                  value={selectedTagId}
                  onChange={(event) => setSelectedTagId(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Resources</option>
                  <option value="untagged">Untagged</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-3">Tag Cost Summary</h2>
            <div className="space-y-3">
              {filteredTags.map((tag) => {
                const budgetUsedPercent = tag.budget > 0 ? (tag.totalCost / tag.budget) * 100 : 0;
                return (
                  <div key={tag.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{tag.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{tag.type}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(tag.totalCost)}</p>
                        <p className="text-xs text-gray-500">{tag.resourceCount} resources</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-2 rounded-full ${budgetUsedPercent > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, budgetUsedPercent))}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Budget {formatCurrency(tag.budget)} • Usage {budgetUsedPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="secondary" onClick={() => handleEditTag(tag)}>
                        <span className="flex items-center gap-1"><Edit3 size={14} />Edit</span>
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteTag(tag.id)}>
                        <span className="flex items-center gap-1"><Trash2 size={14} />Delete</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
              {filteredTags.length === 0 && <p className="text-gray-500 text-sm">No tags match your search.</p>}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">{editingTagId ? 'Edit Tag' : 'Add Tag'}</h2>
            <div className="space-y-3">
              <div>
                <label htmlFor="tag-name" className="block text-sm font-semibold text-gray-700 mb-1">Tag name</label>
                <input
                  id="tag-name"
                  type="text"
                  value={draftTagName}
                  onChange={(event) => setDraftTagName(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="tag-type" className="block text-sm font-semibold text-gray-700 mb-1">Tag type</label>
                <select
                  id="tag-type"
                  value={draftTagType}
                  onChange={(event) => setDraftTagType(event.target.value as TagItem['type'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="department">Department</option>
                  <option value="project">Project</option>
                  <option value="environment">Environment</option>
                  <option value="cost-center">Cost Center</option>
                </select>
              </div>
              <div>
                <label htmlFor="tag-budget" className="block text-sm font-semibold text-gray-700 mb-1">Monthly budget</label>
                <input
                  id="tag-budget"
                  type="number"
                  value={draftTagBudget}
                  onChange={(event) => setDraftTagBudget(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveTag} className="flex-1">
                  <span className="flex items-center justify-center gap-1"><Plus size={16} />{editingTagId ? 'Save Tag' : 'Add Tag'}</span>
                </Button>
                {editingTagId && (
                  <Button variant="secondary" onClick={resetTagForm}>Cancel</Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-bold mb-4">Cost Breakdown by Tag</h2>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={TAG_COLORS[index % TAG_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Tag-wise Trend Analysis (Monthly)</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {tags.slice(0, 4).map((tag, index) => (
                  <Line key={tag.id} type="monotone" dataKey={tag.id} name={tag.name} stroke={TAG_COLORS[index % TAG_COLORS.length]} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-bold mb-4">Resources Grouped by Tags</h2>
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {groupedResources.map((group) => (
                <div key={group.tag.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">{group.tag.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{group.resources.length} resources</p>
                  {group.resources.length === 0 ? (
                    <p className="text-sm text-gray-500">No resources assigned.</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-gray-700">
                      {group.resources.map((resource) => (
                        <li key={resource.id} className="flex justify-between gap-2">
                          <span>{resource.name}</span>
                          <span className="font-medium">{formatCurrency(resource.monthlyCost)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Filtered Resources</h2>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" data-testid="filtered-resources-list">
              {filteredResources.map((resource) => (
                <div key={resource.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900" data-testid="filtered-resource-name">{resource.name}</p>
                      <p className="text-sm text-gray-600">{resource.service} • {resource.region}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(resource.monthlyCost)}</p>
                      <p className="text-xs text-gray-500">{resource.tagId ? (tags.find((tag) => tag.id === resource.tagId)?.name || 'tagged') : 'untagged'}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredResources.length === 0 && <p className="text-sm text-gray-500">No resources found for this filter.</p>}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <h2 className="text-xl font-bold mb-4">Bulk Tag Management</h2>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <select
                value={bulkTagId}
                onChange={(event) => setBulkTagId(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg md:w-72"
                aria-label="Bulk tag selection"
              >
                <option value="">Select tag to apply</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
              <Button onClick={handleBulkApplyTag}>Apply to Selected Resources</Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {resources.map((resource) => (
                <label key={resource.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-800">{resource.name}</span>
                  <input
                    type="checkbox"
                    checked={selectedResourceIds.includes(resource.id)}
                    onChange={() => handleToggleResourceSelection(resource.id)}
                    aria-label={`Select ${resource.name}`}
                  />
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Tag Recommendations</h2>
            <div className="space-y-3">
              {untaggedResources.length === 0 ? (
                <p className="text-sm text-gray-600">All resources are tagged.</p>
              ) : (
                untaggedResources.map((resource) => (
                  <div key={resource.id} className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900">{resource.name}</p>
                    <p className="text-xs text-gray-700 mt-1 flex items-center gap-1">
                      <Sparkles size={12} className="text-primary" />
                      {recommendationText(resource.name)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <h2 className="text-xl font-bold mb-4">Chargeback / Cost Allocation Rules</h2>
            <div className="space-y-3">
              {chargebackRules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900">{rule.scope}</p>
                  <p className="text-sm text-gray-700 mt-1">{rule.strategy}</p>
                  <p className="text-xs text-gray-500 mt-2">Owner: {rule.owner}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Budget Allocation by Tag</h2>
            <div className="space-y-3">
              {tagCosts.map((tag) => {
                const remaining = tag.budget - tag.totalCost;
                return (
                  <div key={tag.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold text-gray-900">{tag.name}</p>
                      <p className={`font-semibold ${remaining < 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(remaining)}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Budget: {formatCurrency(tag.budget)} • Spend: {formatCurrency(tag.totalCost)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
