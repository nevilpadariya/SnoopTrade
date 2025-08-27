import React, { useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import BackgroundImage from '../assests/Images/login_background.jpg';
import Header from '../components/Header';
import SignUpForm from '../components/signup/SignUpForm';
import API_ENDPOINTS from '../utils/apiEndpoints';

const SignUp: React.FC = () => {
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [signUpError, setSignUpError] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (name: string, email: string, password: string, confirmPassword: string) => {
    const validateName = (name: string) => (name.length > 0 ? '' : 'Name is required');
    const validateEmail = (email: string) =>
      /^\S+@\S+\.\S+$/.test(email) ? '' : 'Enter a valid email';
    const validatePassword = (password: string) =>
      password.length >= 6 ? '' : 'Password must be at least 6 characters';
    const validateConfirmPassword = (password: string, confirmPassword: string) =>
      password === confirmPassword ? '' : 'Passwords do not match';

    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

    const fieldErrors = {
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    };

    setErrors(fieldErrors);

    // If no validation errors, proceed to sign up
    if (!nameError && !emailError && !passwordError && !confirmPasswordError) {
      try {
        const response = await fetch(API_ENDPOINTS.signUp, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setSignUpError(errorData.detail || 'Failed to sign up. Please try again.');
        } else {
          console.log('User signed up successfully');
          setSuccessMessage(true);
          setTimeout(() => navigate('/login'), 2000); // Redirect to login after success
        }
      } catch (error) {
        console.error('Error during sign-up:', error);
        setSignUpError('Something went wrong. Please try again.');
      }
    } else {
      setSignUpError('Please fix the form errors before submitting.');
    }
  };

  return (
    <>
      <Header />
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        sx={{
          backgroundImage: `url(${BackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Helmet>
          <title>Sign Up | SnoopTrade</title>
        </Helmet>

        <SignUpForm onSubmit={handleSubmit} error={signUpError} errors={errors} />

        <Snackbar
          open={successMessage}
          autoHideDuration={2000}
          onClose={() => setSuccessMessage(false)}
        >
          <Alert onClose={() => setSuccessMessage(false)} severity="success" sx={{ width: '100%' }}>
            User has been registered successfully!
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
};

export default SignUp;
