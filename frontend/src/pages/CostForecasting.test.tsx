import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CostForecasting } from './CostForecasting';

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('recharts', () => {
  const MockContainer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: MockContainer,
    LineChart: MockContainer,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
    BarChart: MockContainer,
    Bar: () => null,
  };
});

describe('CostForecasting', () => {
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

  it('renders core forecasting sections and horizon cards', () => {
    render(<CostForecasting />);

    expect(screen.getByText('Cost Forecasting')).toBeInTheDocument();
    expect(screen.getByText('3-Month Forecast')).toBeInTheDocument();
    expect(screen.getByText('6-Month Forecast')).toBeInTheDocument();
    expect(screen.getByText('12-Month Forecast')).toBeInTheDocument();
    expect(screen.getByText('Projected 12-Month Service Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Anomaly Detection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Forecast CSV' })).toBeInTheDocument();
  });

  it('shows detected anomaly entries from historical spend', () => {
    render(<CostForecasting />);
    expect(screen.getByText('Potential Anomalies Found: 1')).toBeInTheDocument();
    expect(screen.getByText('Jan 26')).toBeInTheDocument();
  });

  it('updates scenario analysis text when growth slider changes', () => {
    render(<CostForecasting />);

    expect(screen.getByText('What if monthly spending increases by 5% each month?')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '10' } });
    expect(screen.getByText('What if monthly spending increases by 10% each month?')).toBeInTheDocument();
  });

  it('exports forecast data as CSV when export button is clicked', () => {
    render(<CostForecasting />);

    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:forecast');
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

    fireEvent.click(screen.getByRole('button', { name: 'Export Forecast CSV' }));

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:forecast');

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
