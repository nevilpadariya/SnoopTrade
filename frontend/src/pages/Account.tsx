import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import Navbar from '../components/Navbar';
import MobileBottomNav from '../components/MobileBottomNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { useAuth } from '../context/AuthContext';

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
  
  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form submission states
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const authToken = token;
        if (!authToken) {
          setError('Not authenticated. Please log in.');
          setLoading(false);
          return;
        }

        const response = await fetch(API_ENDPOINTS.getUserDetails, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to fetch user data.');
        }
      } catch (err) {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const isGoogleOnlyUser = userData?.login_type === 'google';

  const handlePasswordSubmit = async () => {
    setFormError('');
    setSuccessMessage('');

    // Validation
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

    // For users who already have a password, require current password
    if (!isGoogleOnlyUser && !currentPassword) {
      setFormError('Please enter your current password.');
      return;
    }

    setSubmitting(true);

    try {
      const authToken = token;
      const response = await fetch(API_ENDPOINTS.updateUserProfile, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
          current_password: currentPassword,
        }),
      });

      if (response.ok) {
        setSuccessMessage(
          isGoogleOnlyUser
            ? 'Password created successfully! You can now log in with email and password.'
            : 'Password updated successfully!'
        );
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Update user data to reflect new login_type
        if (isGoogleOnlyUser) {
          setUserData(prev => prev ? { ...prev, login_type: 'both' } : null);
        }
      } else {
        const errorData = await response.json();
        setFormError(errorData.detail || 'Failed to update password.');
      }
    } catch (err) {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hidden md:block"><Navbar /></div>
        <div className="flex items-center justify-center pt-24 sm:pt-32 md:pt-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hidden md:block"><Navbar /></div>
        <div className="flex items-center justify-center pt-24 sm:pt-32 md:pt-40 px-4">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive text-sm sm:text-base">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const initials = getInitials(userData?.name);
  const loginBadge = userData?.login_type === 'google' ? 'Google' :
                     userData?.login_type === 'both' ? 'Google + Email' : 'Email';

  /* ═══ MOBILE ACCOUNT (< 768px) ═══ */
  const mobileAccount = (
    <div className="md:hidden has-bottom-nav" style={{ backgroundColor: '#0E1410', minHeight: '100vh' }}>
      <Helmet>
        <title>Account Settings | SnoopTrade</title>
      </Helmet>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ color: '#EAF5EC', fontSize: 28, fontWeight: 700 }}>Account</h1>

        {/* Avatar profile card */}
        <div className="mobile-card mobile-card-shadow" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="mobile-avatar mobile-avatar-lg">{initials}</div>
          <div>
            <p style={{ color: '#EAF5EC', fontSize: 20, fontWeight: 700 }}>{userData?.name || ''}</p>
            <p style={{ color: '#A7B7AC', fontSize: 13, marginTop: 2 }}>{userData?.email || ''}</p>
            <span style={{
              display: 'inline-block', marginTop: 8, padding: '4px 12px',
              borderRadius: 999, fontSize: 11, fontWeight: 700,
              backgroundColor: userData?.login_type === 'google' ? 'rgba(59,130,246,0.2)' : 'rgba(183,227,137,0.2)',
              color: userData?.login_type === 'google' ? '#60A5FA' : '#B7E389',
            }}>
              {loginBadge}
            </span>
          </div>
        </div>

        {/* Account info card */}
        <div className="mobile-card mobile-card-shadow">
          <h2 style={{ color: '#EAF5EC', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Account Information
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>Email</label>
              <div className="mobile-input" style={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                {userData?.email || ''}
              </div>
            </div>
            <div>
              <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>Name</label>
              <div className="mobile-input" style={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                {userData?.name || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Password card */}
        <div className="mobile-card mobile-card-shadow">
          <h2 style={{ color: '#EAF5EC', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {isGoogleOnlyUser ? 'Create Password' : 'Change Password'}
          </h2>
          {isGoogleOnlyUser && (
            <p style={{ color: '#A7B7AC', fontSize: 13, marginBottom: 16 }}>
              Create a password to also log in with email.
            </p>
          )}

          {successMessage && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 12,
              borderRadius: 12, backgroundColor: 'rgba(104,208,142,0.2)',
              color: '#68D08E', marginBottom: 12, fontSize: 13,
            }}>
              <CheckCircle size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {formError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 12,
              borderRadius: 12, backgroundColor: 'rgba(229,106,106,0.2)',
              color: '#E56A6A', marginBottom: 12, fontSize: 13,
            }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!isGoogleOnlyUser && (
              <div>
                <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>Current Password</label>
                <div className="mobile-input" style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#EAF5EC', fontSize: 15 }}
                  />
                  <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A7B7AC' }}>
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>
                {isGoogleOnlyUser ? 'Password' : 'New Password'}
              </label>
              <div className="mobile-input" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder={isGoogleOnlyUser ? 'Enter password' : 'New password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#EAF5EC', fontSize: 15 }}
                />
                <button onClick={() => setShowNewPassword(!showNewPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A7B7AC' }}>
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>Confirm Password</label>
              <div className="mobile-input" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#EAF5EC', fontSize: 15 }}
                />
                <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A7B7AC' }}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              className="mobile-btn-primary"
              onClick={handlePasswordSubmit}
              disabled={submitting}
              style={{ marginTop: 8 }}
            >
              {submitting
                ? (isGoogleOnlyUser ? 'Creating...' : 'Updating...')
                : (isGoogleOnlyUser ? 'Create Password' : 'Change Password')
              }
            </button>
          </div>
        </div>

        {/* Logout button */}
        <button className="mobile-btn-danger" onClick={handleLogout} style={{ marginTop: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={18} /> Logout
          </span>
        </button>
      </div>

      <MobileBottomNav />
    </div>
  );

  /* ═══ DESKTOP ACCOUNT (≥ 768px) — unchanged ═══ */
  const desktopAccount = (
    <div className="min-h-screen bg-background hidden md:block">
      <Helmet>
        <title>Account Settings | SnoopTrade</title>
      </Helmet>

      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="max-w-3xl mx-auto pt-6 sm:pt-8 md:pt-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground mb-2 font-display">
            Account <span className="text-primary-strong">Settings</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 md:mb-12">
            Manage your account information and security settings.
          </p>

          {/* User Info Card */}
          <Card className="mb-6 sm:mb-8 bg-card border-border">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-card-foreground mb-4 sm:mb-6 font-display">
                Account Information
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-card-foreground">Email Address</Label>
                  <Input
                    type="email"
                    value={userData?.email || ''}
                    disabled
                    className="h-11 bg-muted/50"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-card-foreground">Name</Label>
                  <Input
                    type="text"
                    value={userData?.name || ''}
                    disabled
                    className="h-11 bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-card-foreground">Login Method</Label>
                  <div className="flex items-center gap-2">
                    {userData?.login_type === 'google' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">
                        Google Only
                      </span>
                    )}
                    {userData?.login_type === 'normal' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/20 text-primary">
                        Email & Password
                      </span>
                    )}
                    {userData?.login_type === 'both' && (
                      <>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">
                          Google
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/20 text-primary">
                          Email & Password
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Settings */}
          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-card-foreground mb-2 font-display">
                {isGoogleOnlyUser ? 'Create Password' : 'Change Password'}
              </h2>
              {isGoogleOnlyUser && (
                <p className="text-muted-foreground mb-6">
                  Create a password to enable login with email and password in addition to Google.
                </p>
              )}
              
              {/* Success Message */}
              {successMessage && (
                <div className="flex items-center gap-2 p-4 mb-6 rounded-lg bg-green-500/20 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span>{successMessage}</span>
                </div>
              )}
              
              {/* Error Message */}
              {formError && (
                <div className="flex items-center gap-2 p-4 mb-6 rounded-lg bg-destructive/20 text-destructive-foreground">
                  <AlertCircle className="h-5 w-5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Current Password - only show for users who already have a password */}
                {!isGoogleOnlyUser && (
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-card-foreground">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-card-foreground">
                    {isGoogleOnlyUser ? 'Password' : 'New Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder={isGoogleOnlyUser ? 'Enter password' : 'Enter new password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-card-foreground">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button 
                  onClick={handlePasswordSubmit} 
                  className="px-8"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isGoogleOnlyUser ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    isGoogleOnlyUser ? 'Create Password' : 'Change Password'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileAccount}
      {desktopAccount}
    </>
  );
};

export default Account;
