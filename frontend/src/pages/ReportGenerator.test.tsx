import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReportGenerator } from './ReportGenerator';

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('recharts', () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: MockContainer,
    BarChart: MockContainer,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

describe('ReportGenerator', () => {
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

  it('renders required report sections', () => {
    render(<ReportGenerator />);

    expect(screen.getByText('Report Configuration')).toBeInTheDocument();
    expect(screen.getByText('Preview of Report Contents')).toBeInTheDocument();
    expect(screen.getByText('Monthly Cost Summary')).toBeInTheDocument();
    expect(screen.getByText('Top Spending Items')).toBeInTheDocument();
    expect(screen.getByText('Optimization Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Trend Analysis')).toBeInTheDocument();
    expect(screen.getByText('Anomalies Detected')).toBeInTheDocument();
    expect(screen.getByText('Budget vs Actual Comparison')).toBeInTheDocument();
    expect(screen.getByText('Schedule Report Generation')).toBeInTheDocument();
    expect(screen.getByText('Email Delivery Options')).toBeInTheDocument();
    expect(screen.getByText('Report History / Archive')).toBeInTheDocument();
  });

  it('updates preview when optional section toggles are changed', () => {
    render(<ReportGenerator />);

    expect(screen.getByText('Top Spending Items')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Top spending items'));
    expect(screen.queryByText('Top Spending Items')).not.toBeInTheDocument();
  });

  it('downloads report as pdf when action is triggered', () => {
    render(<ReportGenerator />);

    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
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

    fireEvent.click(screen.getByRole('button', { name: 'Download as PDF' }));

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:report');
    expect(screen.getByText('Report generated and download started.')).toBeInTheDocument();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('allows schedule and delivery preferences updates', () => {
    render(<ReportGenerator />);

    const frequencySelect = screen.getByLabelText('Frequency');
    fireEvent.change(frequencySelect, { target: { value: 'weekly' } });
    expect((frequencySelect as HTMLSelectElement).value).toBe('weekly');

    const emailToggle = screen.getByLabelText('Enable email delivery');
    fireEvent.click(emailToggle);
    expect(screen.getByLabelText('Recipients')).toBeDisabled();
  });
});
