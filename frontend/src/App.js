import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import '@/App.css';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BookingsListPage from './pages/BookingsListPage';
import CreateBookingPage from './pages/CreateBookingPage';

// Lazy load other pages
const BookingDetailPage = React.lazy(() => import('./pages/BookingDetailPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const SuppliersPage = React.lazy(() => import('./pages/SuppliersPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const AuditLogsPage = React.lazy(() => import('./pages/AuditLogsPage'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingsListPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/bookings/create"
              element={
                <ProtectedRoute allowedRoles={['agent1', 'admin']}>
                  <CreateBookingPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/bookings/:id"
              element={
                <ProtectedRoute>
                  <BookingDetailPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['account', 'admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SuppliersPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
