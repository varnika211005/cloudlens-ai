import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './components/ErrorBoundary';

test('renders children inside error boundary', () => {
  render(
    <ErrorBoundary>
      <div>CloudLens UI</div>
    </ErrorBoundary>
  );
  expect(screen.getByText(/cloudlens ui/i)).toBeInTheDocument();
});
