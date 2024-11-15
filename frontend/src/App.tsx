import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme';
import './styles/common.css';
import Sidebar from './components/Sidebar';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Account from './pages/Account';
import { AuthProvider, useAuth } from './contex/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const location = useLocation(); // Get the current location

  // Define the routes where the Sidebar should not appear
  const noSidebarRoutes = ['/signup', '/', '/login'];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box  >
        {/* Conditionally render Sidebar */}
        {!noSidebarRoutes.includes(location.pathname) && <Sidebar />}
        <Box
          component="main"
          flexGrow={1}
          ml={!noSidebarRoutes.includes(location.pathname) ? '250px' : '0'} // Adjust margin for pages without the sidebar
        >
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
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
