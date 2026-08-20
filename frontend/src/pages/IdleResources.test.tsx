import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IdleResources } from './IdleResources';

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('IdleResources', () => {
  it('renders idle resources with initial cost-based sort and total savings', () => {
    render(<IdleResources />);

    expect(screen.getByText('Potential Monthly Savings')).toBeInTheDocument();
    expect(screen.getByText('$654.53')).toBeInTheDocument();

    const cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards[0]).toHaveTextContent('legacy-reporting-db');
  });

  it('filters resources by type', () => {
    render(<IdleResources />);

    const filterSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(filterSelect, { target: { value: 'Storage' } });

    expect(screen.getByText('archive-access-logs')).toBeInTheDocument();
    expect(screen.getByText('orphaned-ebs-volume')).toBeInTheDocument();
    expect(screen.queryByText('legacy-reporting-db')).not.toBeInTheDocument();
  });

  it('sorts resources by idle duration', () => {
    render(<IdleResources />);

    const sortSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(sortSelect, { target: { value: 'idleDuration' } });

    const cards = screen.getAllByRole('heading', { level: 3 });
    expect(cards[0]).toHaveTextContent('archive-access-logs');
  });

  it('shows action messages for terminate and optimize', () => {
    render(<IdleResources />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Terminate' })[0]);
    expect(screen.getByText('Termination initiated for legacy-reporting-db')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Optimize' })[0]);
    expect(screen.queryByText('Termination initiated for legacy-reporting-db')).not.toBeInTheDocument();
    expect(screen.getByText('Optimization workflow started for legacy-reporting-db')).toBeInTheDocument();
  });
});
