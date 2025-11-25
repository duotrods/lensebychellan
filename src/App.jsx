import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';

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
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" />

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
              path="/dashboard/staff"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.STAFF]}>
                  <Dashboard />
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

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
