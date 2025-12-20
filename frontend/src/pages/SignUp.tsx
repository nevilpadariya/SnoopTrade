import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import SignUpForm from '../components/signup/SignUpForm';
import LoginHeader from '../components/Header';
import { Card } from '../components/ui/card';
import API_ENDPOINTS from '../utils/apiEndpoints';

const SignUp: React.FC = () => {
  const [, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const navigate = useNavigate();

  const handleFormSubmit = async (email: string, password: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.signUp, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        setSnackbarMessage('Account created successfully! Redirecting to login...');
        setOpenSnackbar(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const errorData = await response.json();
        setSnackbarMessage(errorData.detail || 'Sign Up failed. Please try again.');
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.error('Error during sign up:', error);
      setSnackbarMessage('Something went wrong. Please try again.');
      setOpenSnackbar(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <Helmet>
        <title>Sign Up - SnoopTrade</title>
      </Helmet>

      <LoginHeader />

      <div className="animate-in fade-in duration-1000 mt-[120px] w-[90%] sm:w-[80%] lg:w-[50%] max-w-[600px] mb-12">
        <Card className="p-8 md:p-12 bg-card border-border shadow-2xl rounded-2xl">
          <h2 className="text-3xl font-bold text-center text-card-foreground mb-8 font-display">
            Create Your Account
          </h2>
          <SignUpForm onSubmit={handleFormSubmit} />
          <p className="text-sm text-center text-muted-foreground mt-8">
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
        <div className="fixed bottom-8 right-8 bg-card border border-border rounded-lg p-4 shadow-xl animate-in slide-in-from-bottom-4">
          <p className="text-card-foreground">{snackbarMessage}</p>
        </div>
      )}
    </div>
  );
};

export default SignUp;
