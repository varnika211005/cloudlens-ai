import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Clouds } from './Clouds';
import api from '../services/api';

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/Loading', () => ({
  Loading: () => <div>Loading...</div>,
}));

jest.mock('../components/Input', () => ({
  Input: () => null,
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    listClouds: jest.fn(),
    connectCloud: jest.fn(),
    disconnectCloud: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('Clouds demo cues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows demo banner, sample action and card badge when account is demo', async () => {
    mockApi.listClouds.mockResolvedValue({
      is_mock_mode: true,
      connected_clouds: [
        {
          id: 1,
          cloud_provider: 'AWS',
          cloud_provider_display: 'Amazon Web Services',
          is_active: true,
          is_verified: true,
          connected_at: '2026-01-01T00:00:00Z',
          last_used_at: '2026-01-01T00:00:00Z',
          additional_data: { is_mock: true },
        },
      ],
    });

    render(<Clouds />);

    expect(await screen.findByText(/Demo mode active/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load sample AWS account/i })).toBeInTheDocument();
    expect(screen.getByText('Demo / Sample account')).toBeInTheDocument();
  });

  it('calls sample aws flow from clouds page', async () => {
    mockApi.listClouds.mockResolvedValue({
      is_mock_mode: true,
      connected_clouds: [],
    });
    mockApi.connectCloud.mockResolvedValue({});

    render(<Clouds />);

    fireEvent.click(await screen.findByRole('button', { name: /Load sample AWS account/i }));

    await waitFor(() => {
      expect(mockApi.connectCloud).toHaveBeenCalledWith('AWS', {
        aws_access_key: 'demo-access-key',
        aws_secret_key: 'demo-secret-key',
      });
    });
  });
});
