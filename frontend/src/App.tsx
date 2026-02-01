import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import CreatePassword from './pages/CreatePassword';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import Features from './pages/Features';
import Account from './pages/Account';
import './App.css';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { token, requiresPassword } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (requiresPassword) return <Navigate to="/create-password" replace />;
  return children;
};

const CreatePasswordRoute = () => {
  const { token, requiresPassword } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!requiresPassword) return <Navigate to="/dashboard" replace />;
  return <CreatePassword />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
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
      </Router>
    </AuthProvider>
  );
};

export default App;
