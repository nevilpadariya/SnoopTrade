import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import API_ENDPOINTS from '../utils/apiEndpoints';

interface UserData {
  email: string;
  name: string;
  login_type: 'normal' | 'google' | 'both';
  first_name?: string;
  last_name?: string;
}

const Account = () => {
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
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Not authenticated. Please log in.');
          setLoading(false);
          return;
        }

        const response = await fetch(API_ENDPOINTS.getUserDetails, {
          headers: {
            'Authorization': `Bearer ${token}`,
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(API_ENDPOINTS.updateUserProfile, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: newPassword,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-24 sm:pt-32 md:pt-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-24 sm:pt-32 md:pt-40 px-4">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive text-sm sm:text-base">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
};

export default Account;
