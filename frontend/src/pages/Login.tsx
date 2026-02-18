import { FormEvent, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CredentialResponse, GoogleOAuthProvider } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import GoogleLoginButton from '../components/login/GoogleLoginButton';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { useAuth } from '../context/AuthContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const LOGIN_WELCOME_ANIMATION_KEY = 'snooptrade.login_welcome_animation';

const Login = () => {
  const [loginError, setLoginError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { token, setToken, setRefreshToken, requiresPassword, setRequiresPassword } = useAuth();

  const loginWithCredentials = async (emailInput: string, passwordInput: string) => {
    if (!emailInput || !passwordInput) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    setLoginError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', emailInput);
      formData.append('password', passwordInput);

      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        const requiresPasswordSetup = Boolean(data.requires_password);
        setToken(data.access_token);
        setRefreshToken(data.refresh_token || null);
        setRequiresPassword(requiresPasswordSetup);
        if (requiresPasswordSetup) {
          navigate('/create-password');
          return;
        }
        sessionStorage.setItem(LOGIN_WELCOME_ANIMATION_KEY, '1');
        navigate('/dashboard');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.detail || 'Login failed. Please try again.';
        setLoginError(errMsg);
        toast.error('Login failed', { description: errMsg });
      }
    } catch {
      const errMsg = 'Something went wrong. Please try again.';
      setLoginError(errMsg);
      toast.error('Connection error', { description: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loginWithCredentials(email.trim(), password);
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    try {
      const googleCredential = response.credential;
      if (!googleCredential) {
        setLoginError('Google token is missing or invalid.');
        return;
      }

      const decodedToken: { email?: string } = jwtDecode(googleCredential);
      if (!decodedToken.email) {
        setLoginError('Google token does not contain email information.');
        return;
      }

      const formData = new URLSearchParams();
      formData.append('username', decodedToken.email);
      formData.append('password', '');
      formData.append('login_type', 'google');
      formData.append('token', googleCredential);

      const tokenResponse = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (tokenResponse.ok) {
        const data = await tokenResponse.json();
        const requiresPasswordSetup = Boolean(data.requires_password);
        setToken(data.access_token);
        setRefreshToken(data.refresh_token || null);
        setRequiresPassword(requiresPasswordSetup);
        if (requiresPasswordSetup) {
          navigate('/create-password');
        } else {
          sessionStorage.setItem(LOGIN_WELCOME_ANIMATION_KEY, '1');
          navigate('/dashboard');
        }
      } else {
        const errorData = await tokenResponse.json().catch(() => ({}));
        const errMsg = errorData.detail || 'Google login failed.';
        setLoginError(errMsg);
        toast.error('Google login failed', { description: errMsg });
      }
    } catch (error) {
      console.error('Error in Google login:', error);
      const errMsg = 'Something went wrong with Google login.';
      setLoginError(errMsg);
      toast.error('Google login error', { description: errMsg });
    }
  };

  const handleGoogleFailure = () => {
    setLoginError('Google login failed.');
    toast.error('Google login failed', { description: 'Please try again or use email login.' });
  };

  if (token && !requiresPassword) {
    return <Navigate to="/dashboard" replace />;
  }
  if (token && requiresPassword) {
    return <Navigate to="/create-password" replace />;
  }

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="signal-surface signal-page text-[#E6ECE8]">
        <Helmet>
          <title>Login - SnoopTrade</title>
        </Helmet>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="signal-glass hidden rounded-3xl p-10 lg:block">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8EA197]">SnoopTrade</p>
              <h1 className="mt-5 text-5xl font-extrabold leading-tight text-[#EAF5EC]">Welcome back</h1>
              <p className="mt-5 max-w-lg text-xl leading-relaxed text-[#BED0C2]">
                Sign in to monitor insider behavior, confidence signals, and market-moving activity.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-4">
                <article className="rounded-2xl border border-[#35503E] bg-[#122019] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Daily filings tracked</p>
                  <p className="mt-3 font-mono text-4xl font-bold text-[#D5E9D6]">14,832</p>
                </article>
                <article className="rounded-2xl border border-[#35503E] bg-[#122019] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Avg signal latency</p>
                  <p className="mt-3 font-mono text-4xl font-bold text-[#D5E9D6]">3.2m</p>
                </article>
              </div>

              <div className="mt-8 rounded-2xl border border-[#2B4134] bg-[#101A14] p-6">
                <h2 className="text-lg font-bold text-[#EAF5EC]">Why analysts choose SnoopTrade</h2>
                <ul className="mt-4 space-y-2 text-sm text-[#BDCDC0]">
                  <li>- Fast SEC event detection</li>
                  <li>- Explainable transaction signals</li>
                  <li>- Clean workflows for daily monitoring</li>
                </ul>
              </div>
            </section>

            <section className="signal-glass rounded-3xl p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EA197] lg:hidden">SnoopTrade</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#EAF5EC] sm:text-4xl">Login</h2>
              <p className="mt-2 text-sm text-[#98AB9E] sm:text-base">Use your email and password to continue.</p>

              <form onSubmit={handleFormSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-[#A7B7AC]">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="signal-input h-12 rounded-2xl border px-4 text-base"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-[#A7B7AC]">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="signal-input h-12 rounded-2xl border px-4 text-base"
                    placeholder="Enter your password"
                  />
                </div>

                {loginError && (
                  <p className="rounded-xl border border-[#603333] bg-[#2B1717] px-4 py-3 text-sm font-medium text-[#F7D1D1]">
                    {loginError}
                  </p>
                )}

                <Button type="submit" disabled={submitting} className="signal-cta h-12 w-full rounded-2xl text-base font-bold">
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Logging in...
                    </span>
                  ) : (
                    'Login'
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#2E4337]" />
                <span className="text-xs font-semibold tracking-[0.14em] text-[#8EA197]">OR</span>
                <div className="h-px flex-1 bg-[#2E4337]" />
              </div>

              <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} />

              <p className="mt-7 text-center text-sm text-[#9AA99F]">
                No account yet?{' '}
                <Link to="/signup" className="font-bold text-[#B9EDAF] hover:underline">
                  Sign up
                </Link>
              </p>
            </section>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;
