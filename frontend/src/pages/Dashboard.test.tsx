import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import api from '../services/api';

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/CostCard', () => ({
  CostCard: ({ title, amount }: { title: string; amount: number }) => <div>{title}: {amount}</div>,
}));

jest.mock('../components/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/Loading', () => ({
  Loading: () => <div>Loading...</div>,
}));

jest.mock('../components/ChatBox', () => ({
  ChatBox: () => null,
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    getDashboard: jest.fn(),
    listClouds: jest.fn(),
    connectCloud: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('Dashboard demo cues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getDashboard.mockResolvedValue({
      total_cost: 0,
      clouds: [],
      active_recommendations: 0,
      recent_alerts: [],
      clouds_connected: 0,
    });
  });

  it('shows demo banner and sample button when cloud list marks demo mode', async () => {
    mockApi.listClouds.mockResolvedValue({
      is_mock_mode: true,
      connected_clouds: [],
    });

    render(<Dashboard />);

    expect(await screen.findByText(/Demo mode active/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load sample AWS account/i })).toBeInTheDocument();
  });

  it('loads sample aws account from dashboard button', async () => {
    mockApi.listClouds.mockResolvedValue({
      is_mock_mode: true,
      connected_clouds: [],
    });
    mockApi.connectCloud.mockResolvedValue({});

    render(<Dashboard />);

    const button = await screen.findByRole('button', { name: /Load sample AWS account/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockApi.connectCloud).toHaveBeenCalledWith('AWS', {
        aws_access_key: 'demo-access-key',
        aws_secret_key: 'demo-secret-key',
      });
    });
  });
});
