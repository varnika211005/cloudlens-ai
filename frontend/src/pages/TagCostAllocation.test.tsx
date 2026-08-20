import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TagCostAllocation } from './TagCostAllocation';

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('recharts', () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: MockContainer,
    PieChart: MockContainer,
    Pie: MockContainer,
    Cell: () => null,
    Tooltip: () => null,
    Legend: () => null,
    LineChart: MockContainer,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
  };
});

describe('TagCostAllocation', () => {
  beforeAll(() => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        writable: true,
        value: () => 'blob:mock',
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        writable: true,
        value: () => undefined,
      });
    }
  });

  it('renders core sections and untagged alert', () => {
    render(<TagCostAllocation />);

    expect(screen.getByText('Tag-Based Cost Allocation')).toBeInTheDocument();
    expect(screen.getByText('Tag Cost Summary')).toBeInTheDocument();
    expect(screen.getByText('Cost Breakdown by Tag')).toBeInTheDocument();
    expect(screen.getByText('Tag-wise Trend Analysis (Monthly)')).toBeInTheDocument();
    expect(screen.getByText('Bulk Tag Management')).toBeInTheDocument();
    expect(screen.getByText('Chargeback / Cost Allocation Rules')).toBeInTheDocument();
    expect(screen.getByText('Untagged resources detected: 2')).toBeInTheDocument();
  });

  it('supports tag search and resource filtering', () => {
    render(<TagCostAllocation />);

    fireEvent.change(screen.getByLabelText('Search tags'), { target: { value: 'prod' } });
    expect(screen.getAllByText('production').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Search tags'), { target: { value: 'zzzz' } });
    expect(screen.getByText('No tags match your search.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter resources by tag'), { target: { value: 'untagged' } });
    const filteredList = screen.getByTestId('filtered-resources-list');
    expect(within(filteredList).getByText('lambda-dev-cron')).toBeInTheDocument();
    expect(within(filteredList).getByText('ebs-orphan-volume-42')).toBeInTheDocument();
    expect(within(filteredList).queryByText('rds-payments-main')).not.toBeInTheDocument();
  });

  it('adds a new tag and updates tag summary', () => {
    render(<TagCostAllocation />);

    fireEvent.change(screen.getByLabelText('Tag name'), { target: { value: 'marketing' } });
    fireEvent.change(screen.getByLabelText('Tag type'), { target: { value: 'department' } });
    fireEvent.change(screen.getByLabelText('Monthly budget'), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Tag/i }));

    expect(screen.getByText('Added tag "marketing".')).toBeInTheDocument();
    expect(screen.getAllByText('marketing').length).toBeGreaterThan(0);
  });

  it('applies bulk tag to selected resources and reduces untagged alert count', () => {
    render(<TagCostAllocation />);

    fireEvent.click(screen.getByLabelText('Select lambda-dev-cron'));
    fireEvent.change(screen.getByLabelText('Bulk tag selection'), { target: { value: 'tag-eng' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to Selected Resources' }));

    expect(screen.getByText('Applied tag to 1 selected resource(s).')).toBeInTheDocument();
    expect(screen.getByText('Untagged resources detected: 1')).toBeInTheDocument();
  });

  it('exports tag costs csv', () => {
    render(<TagCostAllocation />);

    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tag-costs');
    const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const appendChildSpy = jest.spyOn(document.body, 'appendChild');
    const removeChildSpy = jest.spyOn(document.body, 'removeChild');
    const originalCreateElement = document.createElement.bind(document);
    const clickSpy = jest.fn();
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        (element as HTMLAnchorElement).click = clickSpy;
      }
      return element;
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export Tag Costs CSV' }));

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:tag-costs');

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
