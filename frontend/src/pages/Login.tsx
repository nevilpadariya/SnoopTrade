import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import LoginHeader from '../components/Header';
import WelcomePanel from '../components/login/WelcomePanel';
import LoginForm from '../components/login/LoginForm';
import GoogleLoginButton from '../components/login/GoogleLoginButton';
import { Card } from '../components/ui/card';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { useAuth } from '../context/AuthContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const Login = () => {
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const { token, setToken, requiresPassword, setRequiresPassword } = useAuth();

  const handleFormSubmit = async (email: string, password: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        setLoginError(errorData.detail || 'Login failed. Please try again.');
      }
    } catch (error) {
      setLoginError('Something went wrong. Please try again.');
    }
  };

  const handleGoogleSuccess = async (response: any) => {
    try {
      const token = response.credential;
      if (!token) {
        setLoginError('Google token is missing or invalid.');
        return;
      }

      const decodedToken: { email?: string } = jwtDecode(token);

      if (!decodedToken.email) {
        setLoginError('Google token does not contain email information.');
        return;
      }

      const formData = new URLSearchParams();
      formData.append('username', decodedToken.email);
      formData.append('password', '');
      formData.append('login_type', 'google');
      formData.append('token', token);

      const tokenResponse = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (tokenResponse.ok) {
        const data = await tokenResponse.json();
        setToken(data.access_token);
        if (data.requires_password) {
          setRequiresPassword(true);
          navigate('/create-password');
        } else {
          navigate('/dashboard');
        }
      } else {
        const errorData = await tokenResponse.json();
        setLoginError(errorData.detail || 'Google login failed.');
      }
    } catch (error) {
      console.error('Error in Google login:', error);
      setLoginError('Something went wrong with Google login.');
    }
  };

  const handleGoogleFailure = () => {
    setLoginError('Google Login failed.');
  };

  if (token && !requiresPassword) {
    return <Navigate to="/dashboard" replace />;
  }
  if (token && requiresPassword) {
    return <Navigate to="/create-password" replace />;
  }

  return (
    <div className="min-h-screen lg:fixed lg:inset-0 lg:h-screen lg:overflow-hidden flex flex-col items-center bg-background pt-24 sm:pt-28 md:pt-32 lg:pt-24">
      <Helmet>
        <title>Login - SnoopTrade</title>
      </Helmet>

      <LoginHeader />

      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <div className="animate-in fade-in duration-1000 flex-1 flex flex-col min-h-0 items-center justify-center px-4 py-6 lg:py-4 w-[92%] sm:w-[85%] lg:w-[75%] max-w-[1200px] mb-8 sm:mb-12 lg:mb-0">
          <Card className="flex flex-col md:flex-row overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl bg-card border-border max-h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-6rem)]">
            <WelcomePanel />

            <div className="flex-1 flex items-center justify-center p-5 sm:p-8 md:p-12 bg-card min-h-0 overflow-y-auto">
              <div className="w-full max-w-md space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-card-foreground font-display">
                  Login to Your Account
                </h2>

                <LoginForm onSubmit={handleFormSubmit} error={loginError} />

                <div className="flex items-center my-4 sm:my-6">
                  <div className="flex-1 border-b border-border" />
                  <span className="px-4 text-sm text-muted-foreground">OR</span>
                  <div className="flex-1 border-b border-border" />
                </div>

                <div className="w-full">
                  <GoogleLoginButton
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleFailure}
                  />
                </div>

                <p className="text-sm text-center text-muted-foreground mt-4 sm:mt-6">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="text-primary-strong font-semibold hover:underline transition-all"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </GoogleOAuthProvider>
    </div>
  );
};

export default Login;
