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

  /* ─── Mobile Login (< 768px) — matches native app ─── */
  const mobileLogin = (
    <div className="min-h-screen flex flex-col px-5 pt-12 pb-8 md:hidden" style={{ backgroundColor: '#0E1410' }}>
      <Helmet>
        <title>Login - SnoopTrade</title>
      </Helmet>

      {/* Header block */}
      <div className="mb-8" style={{ gap: 8 }}>
        <p style={{ color: '#A7B7AC', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>SnoopTrade</p>
        <h1 style={{ color: '#EAF5EC', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Welcome back</h1>
        <p style={{ color: '#A7B7AC', fontSize: 15 }}>Sign in to track insider activity.</p>
      </div>

      {/* Form block */}
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Email input */}
          <div className="mobile-input">
            <input
              type="email"
              placeholder="Email"
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                color: '#EAF5EC', fontSize: 15,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const pwInput = document.getElementById('mobile-password');
                  if (pwInput) pwInput.focus();
                }
              }}
              id="mobile-email"
            />
          </div>

          {/* Password input */}
          <div className="mobile-input">
            <input
              type="password"
              placeholder="Password"
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                color: '#EAF5EC', fontSize: 15,
              }}
              id="mobile-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const emailEl = document.getElementById('mobile-email') as HTMLInputElement;
                  const pwEl = document.getElementById('mobile-password') as HTMLInputElement;
                  if (emailEl?.value && pwEl?.value) {
                    handleFormSubmit(emailEl.value, pwEl.value);
                  }
                }
              }}
            />
          </div>

          {loginError && (
            <p style={{ color: '#E56A6A', fontSize: 12, marginTop: 4 }}>{loginError}</p>
          )}

          {/* Login button */}
          <button
            className="mobile-btn-primary"
            style={{ marginTop: 12 }}
            onClick={() => {
              const emailEl = document.getElementById('mobile-email') as HTMLInputElement;
              const pwEl = document.getElementById('mobile-password') as HTMLInputElement;
              handleFormSubmit(emailEl?.value || '', pwEl?.value || '');
            }}
          >
            Login
          </button>

          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: '#314036' }} />
            <span style={{ color: '#A7B7AC', fontSize: 12 }}>OR</span>
            <div style={{ flex: 1, height: 1, backgroundColor: '#314036' }} />
          </div>

          {/* Google button */}
          <div style={{ marginTop: 12, width: '100%' }}>
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleFailure}
            />
          </div>

          {/* Sign up link */}
          <p style={{ textAlign: 'center', marginTop: 24, color: '#A7B7AC', fontSize: 15 }}>
            No account yet?{' '}
            <Link to="/signup" style={{ color: '#B7E389', fontWeight: 700, textDecoration: 'none' }}>
              Sign up
            </Link>
          </p>
        </div>
      </GoogleOAuthProvider>
    </div>
  );

  /* ─── Desktop Login (≥ 768px) — unchanged ─── */
  const desktopLogin = (
    <div className="min-h-screen lg:fixed lg:inset-0 lg:h-screen lg:overflow-hidden hidden md:flex flex-col items-center bg-background pt-24 sm:pt-28 md:pt-32 lg:pt-24">
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

  return (
    <>
      {mobileLogin}
      {desktopLogin}
    </>
  );
};

export default Login;
