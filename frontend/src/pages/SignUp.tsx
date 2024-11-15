import React, { useState } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Helmet } from 'react-helmet';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import BackgroundImage from '../assests/Images/login_background.jpg';

const CLIENT_ID = '978139760528-bmaaljd4da3akanum226u4627h4iq98e.apps.googleusercontent.com';

const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [signUpError, setSignUpError] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);
  const navigate = useNavigate();

  const validateName = (name: string) => (name.length > 0 ? '' : 'Name is required');
  const validateEmail = (email: string) =>
    /^\S+@\S+\.\S+$/.test(email) ? '' : 'Enter a valid email';
  const validatePassword = (password: string) =>
    password.length >= 6 ? '' : 'Password must be at least 6 characters';
  const validateConfirmPassword = (password: string, confirmPassword: string) =>
    password === confirmPassword ? '' : 'Passwords do not match';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

    if (!nameError && !emailError && !passwordError && !confirmPasswordError) {
      try {
        const response = await fetch('http://127.0.0.1:8000/auth/signup', {
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
      setErrors({
        name: nameError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
    }
  };

  const handleGoogleSignUp = async (response: any) => {
    try {
      const token = response.credential;
      const decodedToken: { name?: string; email?: string } = jwtDecode(token);

      if (decodedToken.email) {
        const formData = new URLSearchParams();
        formData.append('username', decodedToken.email);
        formData.append('name', decodedToken.name || '');
        formData.append('login_type', 'google');

        const tokenResponse = await fetch('http://127.0.0.1:8000/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (tokenResponse.ok) {
          console.log('User signed up successfully with Google');
          setSuccessMessage(true);
          setTimeout(() => navigate('/dashboard'), 2000); // Redirect to dashboard after success
        } else {
          const errorData = await tokenResponse.json();
          setSignUpError(errorData.detail || 'Failed to sign up with Google. Please try again.');
        }
      } else {
        setSignUpError('Google sign-up failed: No email found.');
      }
    } catch (error) {
      console.error('Error during Google sign-up:', error);
      setSignUpError('Something went wrong with Google sign-up. Please try again.');
    }
  };

  const handleGoogleFailure = () => {
    console.error('Google Sign Up failed');
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
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

        <Paper
          elevation={3}
          sx={{
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '10px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Typography variant="h4" gutterBottom align="center">
            Sign Up
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Name"
              variant="outlined"
              margin="normal"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name}
            />
            <TextField
              label="Email"
              type="email"
              variant="outlined"
              margin="normal"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(errors.email)}
              helperText={errors.email}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              margin="normal"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(errors.password)}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Re-type Password"
              type={showConfirmPassword ? 'text' : 'password'}
              variant="outlined"
              margin="normal"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {signUpError && (
              <Typography color="error" variant="body2" align="center" gutterBottom>
                {signUpError}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ marginTop: '1rem' }}
            >
              Sign Up
            </Button>
          </form>

          <Typography variant="body2" align="center" sx={{ marginY: 2 }}>
            OR
          </Typography>

          <GoogleLogin
            onSuccess={handleGoogleSignUp}
            onError={handleGoogleFailure}
            width="100%"
            theme="outline"
            text="signup_with"
            logo_alignment="center"
          />

        </Paper>

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
    </GoogleOAuthProvider>
  );
};

export default SignUp;
