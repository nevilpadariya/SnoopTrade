import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import SignUpForm from '../components/signup/SignUpForm';
import LoginHeader from '../components/Header';
import { Card } from '../components/ui/card';
import API_ENDPOINTS from '../utils/apiEndpoints';

const SignUp = () => {
  const [, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const navigate = useNavigate();

  const handleFormSubmit = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.signUp, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        setSnackbarMessage('Account created successfully! Redirecting to login...');
        setOpenSnackbar(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const errorData = await response.json();
        let errorMessage = 'Sign Up failed. Please try again.';
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail[0]?.msg || errorMessage;
          } else {
            errorMessage = errorData.detail;
          }
        }
        setSnackbarMessage(errorMessage);
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.error('Error during sign up:', error);
      setSnackbarMessage('Something went wrong. Please try again.');
      setOpenSnackbar(true);
    }
  };

  // Mobile-specific form submit handler (reads from DOM inputs)
  const handleMobileSubmit = () => {
    const nameEl = document.getElementById('mobile-signup-name') as HTMLInputElement;
    const emailEl = document.getElementById('mobile-signup-email') as HTMLInputElement;
    const pwEl = document.getElementById('mobile-signup-password') as HTMLInputElement;
    const confirmEl = document.getElementById('mobile-signup-confirm') as HTMLInputElement;

    const name = nameEl?.value || '';
    const email = emailEl?.value || '';
    const password = pwEl?.value || '';
    const confirm = confirmEl?.value || '';

    if (!name || !email || !password || !confirm) {
      setSnackbarMessage('All fields are required.');
      setOpenSnackbar(true);
      return;
    }

    if (password !== confirm) {
      setSnackbarMessage('Passwords do not match.');
      setOpenSnackbar(true);
      return;
    }

    if (password.length < 6) {
      setSnackbarMessage('Password must be at least 6 characters.');
      setOpenSnackbar(true);
      return;
    }

    handleFormSubmit(name, email, password);
  };

  /* ─── Mobile Signup (< 768px) ─── */
  const mobileSignup = (
    <div className="min-h-screen flex flex-col px-5 pt-12 pb-8 md:hidden" style={{ backgroundColor: '#0E1410' }}>
      <Helmet>
        <title>Sign Up - SnoopTrade</title>
      </Helmet>

      <div className="mb-6">
        <h1 style={{ color: '#EAF5EC', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Create account</h1>
        <p style={{ color: '#A7B7AC', fontSize: 15 }}>Start tracking insider trades.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>Full Name</label>
          <input id="mobile-signup-name" className="mobile-input" placeholder="Full Name" />
        </div>
        <div>
          <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>Email</label>
          <input id="mobile-signup-email" className="mobile-input" placeholder="Email" type="email" autoCapitalize="none" />
        </div>
        <div>
          <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>Password</label>
          <input id="mobile-signup-password" className="mobile-input" placeholder="Password" type="password" />
        </div>
        <div>
          <label style={{ color: '#A7B7AC', fontSize: 12, display: 'block', marginBottom: 6 }}>Confirm Password</label>
          <input id="mobile-signup-confirm" className="mobile-input" placeholder="Confirm Password" type="password" />
        </div>

        {snackbarMessage && (
          <p style={{ color: snackbarMessage.includes('success') ? '#B7E389' : '#E56A6A', fontSize: 12 }}>
            {snackbarMessage}
          </p>
        )}

        <button className="mobile-btn-primary" onClick={handleMobileSubmit}>
          Create Account
        </button>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#A7B7AC', fontSize: 15 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#B7E389', fontWeight: 700, textDecoration: 'none' }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );

  /* ─── Desktop Signup (≥ 768px) — unchanged ─── */
  const desktopSignup = (
    <div className="min-h-screen lg:fixed lg:inset-0 lg:h-screen lg:overflow-hidden hidden md:flex flex-col items-center bg-background pt-24 sm:pt-28 md:pt-32 lg:pt-24">
      <Helmet>
        <title>Sign Up - SnoopTrade</title>
      </Helmet>

      <LoginHeader />

      <div className="animate-in fade-in duration-1000 flex-1 flex flex-col min-h-0 overflow-hidden items-center justify-center px-4 py-6 lg:py-4 w-[92%] sm:w-[85%] lg:w-[75%] max-w-[1200px] mb-8 sm:mb-12 lg:mb-0">
        <Card className="flex flex-col md:flex-row overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl bg-card border-border max-h-[calc(100vh-8rem)] lg:max-h-[calc(100vh-6rem)]">
          {/* Left panel — mirrors login's WelcomePanel */}
          <div className="hidden md:flex flex-1 flex-col justify-center p-8 md:p-12 bg-primary/10 rounded-l-2xl">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 font-display leading-tight">
              Join<br />SnoopTrade
            </h2>
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-4">
                <svg className="w-8 h-8 text-primary-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-muted-foreground text-base">Track insider trading activity</span>
              </div>
              <div className="flex items-center gap-4">
                <svg className="w-8 h-8 text-primary-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-muted-foreground text-base">AI-powered stock forecasting</span>
              </div>
              <div className="flex items-center gap-4">
                <svg className="w-8 h-8 text-primary-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-muted-foreground text-base">Secure and free to use</span>
              </div>
            </div>
          </div>

          {/* Right panel — signup form */}
          <div className="flex-1 flex items-center justify-center p-5 sm:p-8 md:p-12 bg-card min-h-0 overflow-y-auto">
            <div className="w-full max-w-md space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-card-foreground font-display">
                Create Your Account
              </h2>
              <SignUpForm onSubmit={handleFormSubmit} />
              <p className="text-sm text-center text-muted-foreground mt-4 sm:mt-6">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-primary-strong font-semibold hover:underline transition-all"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {snackbarMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 left-4 sm:left-auto bg-card border border-border rounded-lg p-3 sm:p-4 shadow-xl animate-in slide-in-from-bottom-4 max-w-[calc(100%-2rem)] sm:max-w-md">
          <p className="text-card-foreground text-sm sm:text-base">{snackbarMessage}</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {mobileSignup}
      {desktopSignup}
    </>
  );
};

export default SignUp;
