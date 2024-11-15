import React, { useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Helmet } from 'react-helmet';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
import BackgroundImage from '../assests/Images/login_background.jpg';
import LoginHeader from '../components/login/Header';
import WelcomePanel from '../components/login//WelcomePanel';
import LoginForm from '../components/login/LoginForm';
import GoogleLoginButton from '../components/login/GoogleLoginButton';

const CLIENT_ID = '978139760528-bmaaljd4da3akanum226u4627h4iq98e.apps.googleusercontent.com';

const Login: React.FC = () => {
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();

  const handleFormSubmit = async (email: string, password: string) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/auth/token', {
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
      const decodedToken: { email?: string } = jwtDecode(token);

      if (decodedToken.email) {
        const formData = new URLSearchParams();
        formData.append('username', decodedToken.email);
        formData.append('password', '');
        formData.append('login_type', 'google');

        const tokenResponse = await fetch('http://localhost:8000/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          localStorage.setItem('authToken', data.access_token);
          navigate('/dashboard');
        } else {
          const errorData = await tokenResponse.json();
          setLoginError(errorData.detail || 'Google login failed.');
        }
      }
    } catch (error) {
      setLoginError('Something went wrong with Google login.');
    }
  };

  const handleGoogleFailure = () => {
    setLoginError('Google Login failed.');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundImage: `url(${BackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <LoginHeader />
      <GoogleOAuthProvider clientId={CLIENT_ID}>
        <Box
          display="flex"
          flexDirection={{ xs: 'column', md: 'row' }}
          width={{ xs: '90%', sm: '80%', lg: '80%' }}
          maxWidth="1200px"
          borderRadius="15px"
          overflow="hidden"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <WelcomePanel />
          <Box
            flex={1}
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={4}
          >
            <Paper
              elevation={3}
              sx={{
                padding: '2rem',
                width: '100%',
                backgroundColor: '#9D9DA142',
                borderRadius: '10px',
              }}
            >
              <Typography variant="h6" align="center" gutterBottom>
                Login to Your Account
              </Typography>
              <LoginForm onSubmit={handleFormSubmit} error={loginError} />
              <Typography variant="body2" align="center" sx={{ marginY: 2 }}>
                OR
              </Typography>
              <GoogleLoginButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleFailure}
              />
              <Typography variant="body2" align="center" sx={{ marginTop: 2 }}>
                Don't have an account?{' '}
                <Link to="/signup" style={{ color: '#73C2A0', textDecoration: 'none' }}>
                  Sign Up
                </Link>
              </Typography>
            </Paper>
          </Box>
        </Box>
      </GoogleOAuthProvider>
    </div>
  );
};

export default Login;
