// Updated App.tsx to set Landing.tsx as the default route and fix navbar logo behavior
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme';
import './styles/common.css';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Account from './pages/Account';
import FeaturesPage from './pages/Features';
import AboutPage from './pages/About';
import Landing from './pages/Landing';
import { AuthProvider, useAuth } from './contex/AuthContext';


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }



  return <>{children}</>;
};

const App: React.FC = () => {
  const { token } = useAuth();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box component="main">
        <Routes>
          <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/about" element={<AboutPage />} />
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
      </Box>
    </ThemeProvider>
  );
};

const AppWithRouter: React.FC = () => (
  <AuthProvider>
    <Router>
      <App />
    </Router>
  </AuthProvider>
);

export default AppWithRouter;
