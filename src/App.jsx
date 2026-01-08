import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
      cacheTime: 10 * 60 * 1000, // Cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when user returns to tab
      retry: 1, // Retry failed requests once
    },
  },
});

// Existing components
import Navbar from './components/navbar';
import Home from './components/home';
import About from './components/about';
import Services from './components/services';
import Whyus from './components/whyus';
import Accordition from './components/accordition';
import Footer from './components/footer';

// New pages
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Dashboard from './pages/Dashboard';
import FormsSelectionPage from './pages/staff/FormsSelectionPage';
import CCTVCheckFormPage from './pages/staff/CCTVCheckFormPage';
import IncidentReportFormPage from './pages/staff/IncidentReportFormPage';
import AssetDamageFormPage from './pages/staff/AssetDamageFormPage';
import DailyOccurrenceFormPage from './pages/staff/DailyOccurrenceFormPage';
import ReportsListPage from './pages/staff/ReportsListPage';
import CCTVUploadsPage from './pages/staff/CCTVUploadsPage';
import IncidentReportView from './pages/staff/IncidentReportView';
import CCTVCheckView from './pages/staff/CCTVCheckView';
import AssetDamageView from './pages/staff/AssetDamageView';
import DailyOccurrenceView from './pages/staff/DailyOccurrenceView';
import OTPManagementPage from './pages/admin/OTPManagementPage';
import SchemeAssignmentPage from './pages/admin/SchemeAssignmentPage';
import StaffReportsPage from './pages/admin/StaffReportsPage';
import ClientChartsPage from './pages/admin/ClientChartsPage';
import IncidentReportDetailPage from './pages/admin/IncidentReportDetailPage';
import CCTVCheckDetailPage from './pages/admin/CCTVCheckDetailPage';
import AssetDamageDetailPage from './pages/admin/AssetDamageDetailPage';
import DailyLogsDetailPage from './pages/admin/DailyLogsDetailPage';

// Client pages
import AnalyticsPage from './pages/client/AnalyticsPage';
import ReportsPage from './pages/client/ReportsPage';
import CCTVRecordingsPage from './pages/client/CCTVRecordingsPage';
import ClientIncidentReportView from './pages/client/IncidentReportView';
import ClientAssetDamageView from './pages/client/AssetDamageView';
import ClientDailyOccurrenceView from './pages/client/DailyOccurrenceView';
import ClientCCTVCheckView from './pages/client/CCTVCheckView';

import { USER_ROLES } from './utils/constants';
import './index.css';

const LandingPageLayout = () => (
  <div>
    <Navbar />
    <Home />
    <About />
    <Services />
    <Whyus />
    <Accordition />
    <Footer />
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Toaster position="top-right" />
            <Analytics />
            <SpeedInsights />

            <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPageLayout />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/admin/otp-management"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <OTPManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/admin/scheme-assignment"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <SchemeAssignmentPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/admin/staff-reports"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <StaffReportsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/admin/client-charts"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <ClientChartsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Staff Report Detail Pages */}
            <Route
              path="/dashboard/admin/staff-reports/incident/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <IncidentReportDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/admin/staff-reports/cctv/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <CCTVCheckDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/admin/staff-reports/asset/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <AssetDamageDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/admin/staff-reports/daily/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                  <DailyLogsDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Staff Forms Routes */}
            <Route
              path="/dashboard/staff/forms"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <FormsSelectionPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/forms/cctv-check"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <CCTVCheckFormPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/forms/incident-report"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <IncidentReportFormPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/forms/asset-damage"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <AssetDamageFormPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/forms/daily-occurence"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <DailyOccurrenceFormPage />
                </ProtectedRoute>
              }
            />

            {/* Staff Reports and Uploads Routes */}
            <Route
              path="/dashboard/staff/reports"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <ReportsListPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/reports/incident/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <IncidentReportView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/reports/cctv-check/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <CCTVCheckView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/reports/asset-damage/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <AssetDamageView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/reports/daily-logs/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <DailyOccurrenceView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/staff/cctv-uploads"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <CCTVUploadsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/client"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Client Pages Routes */}
            <Route
              path="/dashboard/client/analytics"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/client/reports"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Client Report View Routes */}
            <Route
              path="/dashboard/client/reports/incident/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <ClientIncidentReportView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/client/reports/asset-damage/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <ClientAssetDamageView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/client/reports/daily-occurrence/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <ClientDailyOccurrenceView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/client/reports/cctv-check/:id"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <ClientCCTVCheckView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/client/cctv-recordings"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <CCTVRecordingsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
