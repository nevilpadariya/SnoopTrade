import { useState } from 'react';
import { Helmet } from 'react-helmet';
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
        // Handle FastAPI validation errors (detail is an array) vs regular errors (detail is a string)
        let errorMessage = 'Sign Up failed. Please try again.';
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Pydantic validation error - extract message from first error
            errorMessage = errorData.detail[0]?.msg || errorMessage;
          } else {
            // Regular error message
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

  return (
    <div className="min-h-screen lg:fixed lg:inset-0 lg:h-screen lg:overflow-hidden flex flex-col items-center bg-background pt-24 sm:pt-28 md:pt-32 lg:pt-24">
      <Helmet>
        <title>Sign Up - SnoopTrade</title>
      </Helmet>

      <LoginHeader />

      <div className="animate-in fade-in duration-1000 flex-1 flex flex-col min-h-0 overflow-hidden items-center justify-center px-4 py-6 lg:py-2 w-[92%] sm:w-[85%] lg:w-[50%] max-w-[600px] mb-8 sm:mb-12 lg:mb-0">
        <Card className="p-5 sm:p-8 md:p-12 lg:p-5 bg-card border-border shadow-2xl rounded-xl sm:rounded-2xl max-h-full overflow-hidden flex flex-col min-h-0">
          <h2 className="text-2xl sm:text-3xl lg:text-xl font-bold text-center text-card-foreground mb-6 sm:mb-8 lg:mb-3 font-display shrink-0">
            Create Your Account
          </h2>
          <SignUpForm onSubmit={handleFormSubmit} />
          <p className="text-sm text-center text-muted-foreground mt-6 sm:mt-8 lg:mt-3 shrink-0">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-strong font-semibold hover:underline transition-all"
            >
              Login
            </Link>
          </p>
        </Card>
      </div>

      {snackbarMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 left-4 sm:left-auto bg-card border border-border rounded-lg p-3 sm:p-4 shadow-xl animate-in slide-in-from-bottom-4 max-w-[calc(100%-2rem)] sm:max-w-md">
          <p className="text-card-foreground text-sm sm:text-base">{snackbarMessage}</p>
        </div>
      )}
    </div>
  );
};

export default SignUp;
