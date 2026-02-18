import { FormEvent, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';

const CreatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { token, setToken, requiresPassword, setRequiresPassword } = useAuth();

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    if (!requiresPassword) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, requiresPassword, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authFetch(
        API_ENDPOINTS.updateUserProfile,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        },
        token ?? undefined,
      );

      if (response.ok) {
        setRequiresPassword(false);
        navigate('/dashboard', { replace: true });
      } else if (response.status === 401) {
        setToken(null);
        navigate('/login', { replace: true });
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || 'Failed to set password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !requiresPassword) {
    return null;
  }

  return (
    <div className="signal-surface min-h-screen text-[#E6ECE8]">
      <Helmet>
        <title>Create Password - SnoopTrade</title>
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-[#2D4035] bg-[#101813]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight text-[#E6ECE8] sm:text-2xl">
            SnoopTrade
          </Link>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-[#35503D] bg-[#18241D] px-4 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
          >
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="signal-grid-overlay">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
          <section className="signal-glass hidden rounded-3xl p-10 lg:block">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8EA197]">Account Security</p>
            <h1 className="mt-4 text-5xl font-extrabold leading-tight text-[#EAF5EC]">Create a password</h1>
            <p className="mt-5 max-w-lg text-xl leading-relaxed text-[#BED0C2]">
              You signed in with Google. Set a password so you can also sign in with email and password.
            </p>
            <div className="mt-10 rounded-2xl border border-[#35503E] bg-[#122019] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Security tip</p>
              <p className="mt-3 text-sm leading-relaxed text-[#C6D7CB]">
                Use a unique password with at least 8 characters, numbers, and symbols to improve account security.
              </p>
            </div>
          </section>

          <section className="signal-glass rounded-3xl p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EA197] lg:hidden">Account Security</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#EAF5EC] sm:text-4xl">Create Password</h2>
            <p className="mt-2 text-sm text-[#98AB9E] sm:text-base">Add a password to complete your account setup.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-[#A7B7AC]">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="signal-input h-12 rounded-2xl border pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((state) => !state)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93A89A] hover:text-[#D4E2D6]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-[#A7B7AC]">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="signal-input h-12 rounded-2xl border pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((state) => !state)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93A89A] hover:text-[#D4E2D6]"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-[#603333] bg-[#2B1717] px-4 py-3 text-sm font-medium text-[#F7D1D1]">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={isLoading} className="signal-cta h-12 w-full rounded-2xl text-base font-bold">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Password'
                )}
              </Button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CreatePassword;
