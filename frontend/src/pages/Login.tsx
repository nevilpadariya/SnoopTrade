// Updated Login.tsx to ensure successful login or Google sign-in redirects to the dashboard page
import React, { useState } from 'react';
import { Box, Paper, Typography, Fade } from '@mui/material';
import { Helmet } from 'react-helmet';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import BackgroundImage from '../assests/Images/login_background.jpg';
import LoginHeader from '../components/Header';
import WelcomePanel from '../components/login/WelcomePanel';
import LoginForm from '../components/login/LoginForm';
import GoogleLoginButton from '../components/login/GoogleLoginButton';
import API_ENDPOINTS from '../utils/apiEndpoints';

const CLIENT_ID = '978139760528-bmaaljd4da3akanum226u4627h4iq98e.apps.googleusercontent.com';



const Login: React.FC = () => {
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const handleFormSubmit = async (email: string, password: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.access_token);
        navigate('/dashboard');
      } else {
        const errorData = await response.json();
        setLoginError(errorData.detail || 'Login failed. Please try again.');
      }
    } catch (error) {
      setLoginError('Something went wrong. Please try again.');
    }
  };

  const handleGoogleSuccess = async (response: any) => {
  try {
    const token = response.credential;
    if (!token) {
      setLoginError('Google token is missing or invalid.');
      return;
    }

    // Decode the Google token to extract the email
    const decodedToken: { email?: string } = jwtDecode(token);

    if (!decodedToken.email) {
      setLoginError('Google token does not contain email information.');
      return;
    }

    // Prepare form data for login request
    const formData = new URLSearchParams();
    formData.append('username', decodedToken.email);
    formData.append('password', ''); // Password not needed for Google login
    formData.append('login_type', 'google');
    formData.append('token', token);

    // Send login request to the backend
    const tokenResponse = await fetch(API_ENDPOINTS.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
console.log('Token Response:', tokenResponse);
    if (tokenResponse.ok) {
      const data = await tokenResponse.json();
      localStorage.setItem('authToken', data.access_token);
      navigate('/dashboard'); // Redirect to the dashboard on success
    } else {
      const errorData = await tokenResponse.json();
      setLoginError(errorData.detail || 'Google login failed.');
    }
  } catch (error) {
    console.error('Error in Google login:', error);
    setLoginError('Something went wrong with Google login.');
  }
};


  const handleGoogleFailure = () => {
    setLoginError('Google Login failed.');
  };
if (token) {
  return <Navigate to="/dashboard" replace />;
}
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${BackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <Helmet>
        <title>Login - SnoopTrade</title>
      </Helmet>
      
      <LoginHeader />
      
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <Fade in timeout={1000}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              width: { xs: '90%', sm: '80%', lg: '80%' },
              maxWidth: '1200px',
              borderRadius: '16px',
              overflow: 'hidden',
              marginTop: '120px',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-5px)',
              },
            }}
          >
            <WelcomePanel />
            
            <Box
              flex={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={4}
              sx={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 0.9) 100%)',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  padding: '2.5rem',
                  width: '100%',
                  maxWidth: '400px',
                  backgroundColor: 'transparent',
                  borderRadius: '12px',
                }}
              >
                <Typography 
                  variant="h5" 
                  align="center" 
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: '#2D3748',
                    marginBottom: 3,
                  }}
                >
                  Login to Your Account
                </Typography>
                
                <LoginForm onSubmit={handleFormSubmit} error={loginError} />
                
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '24px 0',
                    '&::before, &::after': {
                      content: '""',
                      flex: 1,
                      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
                    },
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      margin: '0 16px',
                      color: '#6B7280',
                    }}
                  >
                    OR
                  </Typography>
                </Box>
                
                <GoogleLoginButton
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleFailure}
                />
                
                <Typography 
                  variant="body2" 
                  align="center" 
                  sx={{ 
                    marginTop: 3,
                    color: '#4A5568',
                  }}
                >
                  Don't have an account?{' '}
                  <Link 
                    to="/signup" 
                    style={{ 
                      color: '#73C2A0', 
                      textDecoration: 'none',
                      fontWeight: 600,
                      transition: 'color 0.2s ease',
                    }}
                  >
                    Sign Up
                  </Link>
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Fade>
      </GoogleOAuthProvider>
    </Box>
  );
};

export default Login;
