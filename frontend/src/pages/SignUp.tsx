import { FormEvent, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import API_ENDPOINTS from '../utils/apiEndpoints';

const SignUp = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (name.trim().split(' ').length < 2) {
      setError('Please enter your full name (first and last).');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid.');
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

    setSubmitting(true);
    try {
      const response = await fetch(API_ENDPOINTS.signUp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        setSuccessMessage('Account created successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        const errorData = await response.json().catch(() => ({}));
        let message = 'Sign up failed. Please try again.';
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            message = errorData.detail[0]?.msg || message;
          } else if (typeof errorData.detail === 'string') {
            message = errorData.detail;
          }
        }
        setError(message);
      }
    } catch (submitError) {
      console.error('Error during sign up:', submitError);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signal-surface signal-page overflow-x-hidden text-[#E6ECE8] lg:overflow-hidden">
      <Helmet>
        <title>Sign Up - SnoopTrade</title>
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
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main className="signal-grid-overlay lg:h-[calc(100dvh-4rem)]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:h-full lg:grid-cols-2 lg:px-8 lg:py-6">
          <section className="signal-glass hidden rounded-3xl p-8 lg:block lg:h-full">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8EA197]">SnoopTrade</p>
            <h1 className="mt-4 text-5xl font-extrabold leading-tight text-[#EAF5EC]">Create your account</h1>
            <p className="mt-5 max-w-lg text-xl leading-relaxed text-[#BED0C2]">
              Start tracking insider activity with clean, realtime market intelligence.
            </p>
            <div className="mt-10 space-y-3 text-sm text-[#BDD0C1]">
              <p>- Track insider trading activity in realtime</p>
              <p>- Analyze trend and confidence signals</p>
              <p>- Keep your workflow fast and secure</p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <article className="rounded-2xl border border-[#35503E] bg-[#122019] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Realtime filings</p>
                <p className="mt-3 font-mono text-4xl font-bold text-[#D5E9D6]">24/7</p>
              </article>
              <article className="rounded-2xl border border-[#35503E] bg-[#122019] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Forecast insights</p>
                <p className="mt-3 font-mono text-4xl font-bold text-[#D5E9D6]">AI</p>
              </article>
            </div>
          </section>

          <section className="signal-glass rounded-3xl p-6 sm:p-8 lg:flex lg:h-full lg:flex-col lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EA197] lg:hidden">SnoopTrade</p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#EAF5EC] sm:text-4xl">Sign Up</h2>
            <p className="mt-2 text-sm text-[#98AB9E] sm:text-base">Create your account and start exploring insider signals.</p>

            <form onSubmit={handleFormSubmit} className="mt-6 space-y-4 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold text-[#A7B7AC]">Full Name</label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="signal-input h-12 rounded-2xl border px-4 text-base"
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-[#A7B7AC]">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="signal-input h-12 rounded-2xl border px-4 text-base"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-[#A7B7AC]">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="signal-input h-12 rounded-2xl border px-4 text-base"
                  placeholder="Create password"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-semibold text-[#A7B7AC]">Confirm Password</label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="signal-input h-12 rounded-2xl border px-4 text-base"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-[#603333] bg-[#2B1717] px-4 py-3 text-sm font-medium text-[#F7D1D1]">
                  {error}
                </p>
              )}
              {successMessage && (
                <p className="rounded-xl border border-[#35503D] bg-[#18291F] px-4 py-3 text-sm font-medium text-[#BEE6BE]">
                  {successMessage}
                </p>
              )}

              <Button type="submit" disabled={submitting} className="signal-cta h-12 w-full rounded-2xl text-base font-bold">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <p className="mt-7 text-center text-sm text-[#9AA99F]">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#B9EDAF] hover:underline">
                Login
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SignUp;
