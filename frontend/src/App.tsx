import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './context/AuthContext';
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

// Minimal loading spinner shown while code chunks load
const PageSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'hsl(var(--background))',
  }}>
    <div style={{
      width: 36,
      height: 36,
      border: '3px solid hsl(var(--muted))',
      borderTopColor: 'hsl(var(--primary))',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    }} />
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

const App = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/" element={<Landing />} />
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
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
};

export default App;
