import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import LoginHeader from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import API_ENDPOINTS from '../utils/apiEndpoints';
import { useAuth } from '../context/AuthContext';

const CreatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { token, requiresPassword, setRequiresPassword } = useAuth();

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    if (!requiresPassword) {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [token, requiresPassword, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const response = await fetch(API_ENDPOINTS.updateUserProfile, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        setRequiresPassword(false);
        navigate('/dashboard', { replace: true });
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
    <div className="min-h-screen lg:fixed lg:inset-0 lg:h-screen lg:overflow-hidden flex flex-col items-center bg-background pt-24 sm:pt-28 md:pt-32 lg:pt-24">
      <Helmet>
        <title>Create Password - SnoopTrade</title>
      </Helmet>

      <LoginHeader />

      <div className="animate-in fade-in duration-1000 flex-1 flex flex-col min-h-0 items-center justify-center px-4 py-6 lg:py-4 w-[92%] sm:w-[85%] lg:w-[50%] max-w-[500px] mb-8 sm:mb-12 lg:mb-0">
        <Card className="p-5 sm:p-8 bg-card border-border shadow-2xl rounded-xl sm:rounded-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-card-foreground mb-2 font-display">
            Create a password for your account
          </h2>
          <p className="text-sm text-center text-muted-foreground mb-6">
            You signed in with Google. Set a password so you can also sign in with email and password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-card-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary-strong transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-card-foreground">
                Confirm password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary-strong transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="login-error-message bg-destructive/30 border border-destructive text-destructive-foreground text-sm p-3 rounded-md text-center font-medium"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                'Create password'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreatePassword;
