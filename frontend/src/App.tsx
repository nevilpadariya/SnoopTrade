import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import ThemeFloatingToggle from './components/ThemeFloatingToggle';
import { hasThemePreference, syncThemeWithPreference } from './utils/theme';
import './App.css';

// ─── Lazy-loaded pages (code-split into separate chunks) ───
const Landing = React.lazy(() => import('./pages/Landing'));
const Login = React.lazy(() => import('./pages/Login'));
const SignUp = React.lazy(() => import('./pages/SignUp'));
const CreatePassword = React.lazy(() => import('./pages/CreatePassword'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const About = React.lazy(() => import('./pages/About'));
const Features = React.lazy(() => import('./pages/Features'));
const Account = React.lazy(() => import('./pages/Account'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Minimal loading spinner shown while code chunks load
const PageSpinner = () => (
  <div className="signal-surface flex min-h-screen items-center justify-center">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#2F4538] border-t-[#A7E89A]" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, requiresPassword } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (requiresPassword) return <Navigate to="/create-password" replace />;
  return <>{children}</>;
};

const CreatePasswordRoute = () => {
  const { token, requiresPassword } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!requiresPassword) return <Navigate to="/dashboard" replace />;
  return <CreatePassword />;
};

const HomeRoute = () => {
  const { token, requiresPassword } = useAuth();
  if (!token) return <Landing />;
  if (requiresPassword) return <Navigate to="/create-password" replace />;
  return <Navigate to="/dashboard" replace />;
};

const App = () => {
  useEffect(() => {
    syncThemeWithPreference();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = () => {
      if (!hasThemePreference()) {
        syncThemeWithPreference();
      }
    };
    media.addEventListener('change', onMediaChange);
    return () => media.removeEventListener('change', onMediaChange);
  }, []);

  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/create-password" element={<CreatePasswordRoute />} />
              <Route path="/about" element={<About />} />
              <Route path="/features" element={<Features />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <ThemeFloatingToggle />
        </Router>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </HelmetProvider>
  );
};

export default App;
