import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Clouds } from './pages/Clouds';
import { Billing } from './pages/Billing';
import { Recommendations } from './pages/Recommendations';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';
import { AnomalyDetection } from './pages/AnomalyDetection';
import { CarbonFootprint } from './pages/CarbonFootprint';
import { WhatIfSimulator } from './pages/WhatIfSimulator';
import { RegionAdvisor } from './pages/RegionAdvisor';
import { IdleResources } from './pages/IdleResources';
import { CostForecasting } from './pages/CostForecasting';
import { ReportGenerator } from './pages/ReportGenerator';
import { TagCostAllocation } from './pages/TagCostAllocation';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clouds"
        element={
          <ProtectedRoute>
            <Clouds />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Billing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recommendations"
        element={
          <ProtectedRoute>
            <Recommendations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/carbon"
        element={
          <ProtectedRoute>
            <CarbonFootprint />
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulator"
        element={
          <ProtectedRoute>
            <WhatIfSimulator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/regions"
        element={
          <ProtectedRoute>
            <RegionAdvisor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/idle-resources"
        element={
          <ProtectedRoute>
            <IdleResources />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forecast"
        element={
          <ProtectedRoute>
            <CostForecasting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tags"
        element={
          <ProtectedRoute>
            <TagCostAllocation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/anomalies"
        element={
          <ProtectedRoute>
            <AnomalyDetection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Default route */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
        }
      />
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
