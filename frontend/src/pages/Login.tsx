import { useState } from 'react';
import { Helmet } from 'react-helmet';
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

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const Login = () => {
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const { token, setToken } = useAuth();

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
        navigate('/dashboard');
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

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <Helmet>
        <title>Login - SnoopTrade</title>
      </Helmet>

      <LoginHeader />

      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <div className="animate-in fade-in duration-1000 mt-24 sm:mt-28 md:mt-32 w-[92%] sm:w-[85%] lg:w-[75%] max-w-[1200px] mb-8 sm:mb-12">
          <Card className="flex flex-col md:flex-row overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl bg-card border-border">
            <WelcomePanel />

            <div className="flex-1 flex items-center justify-center p-5 sm:p-8 md:p-12 bg-card">
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

                <GoogleLoginButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleFailure}
                />

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
