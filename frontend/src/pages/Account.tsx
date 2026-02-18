import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, LogOut, Moon, Sun } from 'lucide-react';
import MobileBottomNav from '../components/MobileBottomNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';
import { getThemePreference, toggleThemePreference, type ThemeMode } from '../utils/theme';

interface UserData {
  email: string;
  name: string;
  login_type: 'normal' | 'google' | 'both';
  first_name?: string;
  last_name?: string;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

const Account = () => {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    setThemeMode(getThemePreference());
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!token) {
          setError('Not authenticated. Please log in.');
          setLoading(false);
          return;
        }

        const response = await authFetch(API_ENDPOINTS.getUserDetails, undefined, token);
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else if (response.status === 401) {
          setToken(null);
          navigate('/login', { replace: true });
          return;
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.detail || 'Failed to fetch user data.');
        }
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void fetchUserData();
  }, [navigate, setToken, token]);

  const isGoogleOnlyUser = userData?.login_type === 'google';

  const handlePasswordSubmit = async () => {
    setFormError('');
    setSuccessMessage('');

    if (!newPassword || !confirmPassword) {
      setFormError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (!isGoogleOnlyUser && !currentPassword) {
      setFormError('Please enter your current password.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch(
        API_ENDPOINTS.updateUserProfile,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: newPassword,
            current_password: currentPassword,
          }),
        },
        token ?? undefined,
      );

      if (response.ok) {
        setSuccessMessage(
          isGoogleOnlyUser
            ? 'Password created successfully! You can now log in with email and password.'
            : 'Password updated successfully!',
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (isGoogleOnlyUser) {
          setUserData((prev) => (prev ? { ...prev, login_type: 'both' } : null));
        }
      } else if (response.status === 401) {
        setToken(null);
        navigate('/login', { replace: true });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setFormError(errorData.detail || 'Failed to update password.');
      }
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  const handleThemeToggle = () => {
    setThemeMode(toggleThemePreference());
  };

  const initials = getInitials(userData?.name);
  const loginBadge = userData?.login_type === 'google' ? 'Google' : userData?.login_type === 'both' ? 'Google + Email' : 'Email';

  return (
    <div className="signal-surface signal-page text-[#E6ECE8]">
      <Helmet>
        <title>Account Settings - SnoopTrade</title>
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-[#2D4035] bg-[#101813]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight text-[#E6ECE8] sm:text-2xl">
            SnoopTrade
          </Link>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleThemeToggle}
              className="h-10 rounded-xl border-[#35503D] bg-[#18241D] px-3 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
            >
              {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-[#35503D] bg-[#18241D] px-4 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
            >
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="signal-grid-overlay">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          {loading ? (
            <div className="signal-glass flex h-64 items-center justify-center rounded-3xl">
              <Loader2 className="h-8 w-8 animate-spin text-[#A7E89A]" />
            </div>
          ) : error ? (
            <div className="signal-glass rounded-3xl p-8 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-[#F26D6D]" />
              <p className="mt-4 text-base font-medium text-[#F2C9C9]">{error}</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              <section className="signal-glass rounded-3xl p-6 lg:col-span-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#3D5A45] bg-[#213329] text-xl font-bold text-[#DCEADA]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-[#EAF5EC]">{userData?.name || ''}</p>
                    <p className="truncate text-sm text-[#A8BAAD]">{userData?.email || ''}</p>
                  </div>
                </div>
                <div className="mt-4 inline-flex rounded-full border border-[#35503D] bg-[#18241D] px-3 py-1 text-xs font-semibold text-[#C9D8CB]">
                  {loginBadge}
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Account Information</p>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#8EA197]">Email</label>
                    <Input disabled value={userData?.email || ''} className="signal-input h-11 rounded-xl border opacity-80" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#8EA197]">Name</label>
                    <Input disabled value={userData?.name || ''} className="signal-input h-11 rounded-xl border opacity-80" />
                  </div>
                </div>

                <Button
                  onClick={handleLogout}
                  className="mt-6 h-11 w-full rounded-xl border border-[#603333] bg-[#2B1717] text-sm font-bold text-[#F6D8D8] hover:bg-[#341D1D]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </section>

              <section className="signal-glass rounded-3xl p-6 lg:col-span-8">
                <h1 className="text-3xl font-extrabold text-[#EAF5EC] sm:text-4xl">Security</h1>
                <p className="mt-2 text-sm text-[#9BAEA1] sm:text-base">
                  {isGoogleOnlyUser
                    ? 'Create a password to enable email login in addition to Google.'
                    : 'Update your password to keep your account secure.'}
                </p>

                {successMessage && (
                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#35503D] bg-[#18291F] px-4 py-3 text-sm text-[#BEE6BE]">
                    <CheckCircle className="h-4 w-4" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {formError && (
                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#603333] bg-[#2B1717] px-4 py-3 text-sm text-[#F5CACA]">
                    <AlertCircle className="h-4 w-4" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {!isGoogleOnlyUser && (
                    <div className="space-y-2">
                      <label htmlFor="currentPassword" className="text-sm font-semibold text-[#A7B7AC]">
                        Current Password
                      </label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          placeholder="Enter current password"
                          className="signal-input h-12 rounded-xl border pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((state) => !state)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93A89A] hover:text-[#D4E2D6]"
                        >
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-semibold text-[#A7B7AC]">
                      {isGoogleOnlyUser ? 'Password' : 'New Password'}
                    </label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder={isGoogleOnlyUser ? 'Create password' : 'Enter new password'}
                        className="signal-input h-12 rounded-xl border pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((state) => !state)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93A89A] hover:text-[#D4E2D6]"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm password"
                        className="signal-input h-12 rounded-xl border pr-11"
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

                  <Button onClick={handlePasswordSubmit} disabled={submitting} className="signal-cta h-12 rounded-xl px-6 text-sm font-bold">
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isGoogleOnlyUser ? 'Creating...' : 'Updating...'}
                      </span>
                    ) : isGoogleOnlyUser ? (
                      'Create Password'
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default Account;
