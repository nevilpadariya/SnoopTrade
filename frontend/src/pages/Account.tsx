import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Container,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import API_ENDPOINTS from '../utils/apiEndpoints';

// Color palette matching Dashboard theme
const COLORS = {
  primary: '#00D09C',
  secondary: '#1A1A1A',
  accent: '#73C2A0',
  background: {
    main: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9))',
    paper: 'rgba(115, 194, 160, 0.1)',
    card: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.8)',
    muted: 'rgba(255, 255, 255, 0.7)',
  },
};

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/');
  };

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        background: COLORS.background.main,
        py: 2,
        px: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: COLORS.accent,
          fontWeight: 700,
          cursor: 'pointer',
          '&:hover': { 
            textDecoration: 'none',
            opacity: 0.8,
            transform: 'translateY(-1px)',
            transition: 'all 0.2s ease-in-out',
          },
        }}
        onClick={() => navigate('/dashboard')}
      >
        SnoopTrade
      </Typography>
      <Button
        variant="outlined"
        onClick={handleLogout}
        sx={{
          textTransform: 'none',
          borderColor: COLORS.accent,
          color: COLORS.text.primary,
          '&:hover': {
            borderColor: COLORS.primary,
            backgroundColor: 'rgba(115, 194, 160, 0.1)',
          },
        }}
      >
        Logout
      </Button>
    </Box>
  );
};

const Account: React.FC = () => {
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

  const fetchUserData = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(API_ENDPOINTS.getUserDetails, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setName(data.name);
        setEmail(data.email);
      } else {
        console.error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const validateName = (name: string) => (name.length > 0 ? '' : 'Name is required');
  const validatePassword = (password: string) =>
    password.length >= 6 ? '' : 'Password must be at least 6 characters';
  const validateConfirmPassword = (password: string, confirmPassword: string) =>
    password === confirmPassword ? '' : 'Passwords do not match';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameError = validateName(name);
    const passwordError = password ? validatePassword(password) : '';
    const confirmPasswordError = password ? validateConfirmPassword(password, confirmPassword) : '';

    if (!nameError && !passwordError && !confirmPasswordError) {
      try {
        const token = localStorage.getItem('authToken');
        const updateData: any = { name };
        if (password) {
          updateData.password = password;
        }

        const response = await fetch(API_ENDPOINTS.updateUserProfile, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          alert('Account details updated!');
          setPassword('');
          setConfirmPassword('');
        } else {
          console.error('Failed to update account');
        }
      } catch (error) {
        console.error('Error updating account:', error);
      }
    } else {
      setErrors({
        name: nameError,
        email: '',
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: COLORS.background.main,
        color: COLORS.text.primary,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 30%, rgba(115, 194, 160, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Helmet>
        <title>Account | SnoopTrade</title>
      </Helmet>

      <Navbar />
      
      <Container maxWidth="lg" sx={{ pt: 12, pb: 8 }}>
        <Typography
          variant="h1"
          align="center"
          sx={{
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            fontWeight: 800,
            color: COLORS.text.primary,
            mb: 3,
            '& span': {
              background: 'linear-gradient(45deg, #73C2A0 30%, #A8E6CF 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            },
          }}
        >
          Account <span>Settings</span>
        </Typography>
        
        <Box
          sx={{
            mt: 6,
            mx: 'auto',
            maxWidth: '500px',
            background: COLORS.background.card,
            borderRadius: '16px',
            p: 4,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          }}
        >
          <TextField
            label="Name"
            variant="outlined"
            margin="normal"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(115, 194, 160, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: COLORS.accent,
                },
                '&.Mui-focused fieldset': {
                  borderColor: COLORS.primary,
                },
              },
              '& .MuiInputLabel-root': {
                color: COLORS.text.secondary,
              },
              '& .MuiOutlinedInput-input': {
                color: COLORS.text.primary,
              },
            }}
          />

          <TextField
            label="Email"
            type="email"
            variant="outlined"
            margin="normal"
            fullWidth
            value={email}
            disabled
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(115, 194, 160, 0.3)',
                },
                '&.Mui-disabled': {
                  '& fieldset': {
                    borderColor: 'rgba(115, 194, 160, 0.1)',
                  },
                },
              },
              '& .MuiInputLabel-root': {
                color: COLORS.text.muted,
              },
              '& .MuiOutlinedInput-input': {
                color: COLORS.text.muted,
              },
            }}
          />

          <TextField
            label="New Password"
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
                    sx={{ color: COLORS.text.secondary }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(115, 194, 160, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: COLORS.accent,
                },
                '&.Mui-focused fieldset': {
                  borderColor: COLORS.primary,
                },
              },
              '& .MuiInputLabel-root': {
                color: COLORS.text.secondary,
              },
              '& .MuiOutlinedInput-input': {
                color: COLORS.text.primary,
              },
            }}
          />

          <TextField
            label="Confirm New Password"
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
                    sx={{ color: COLORS.text.secondary }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(115, 194, 160, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: COLORS.accent,
                },
                '&.Mui-focused fieldset': {
                  borderColor: COLORS.primary,
                },
              },
              '& .MuiInputLabel-root': {
                color: COLORS.text.secondary,
              },
              '& .MuiOutlinedInput-input': {
                color: COLORS.text.primary,
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            sx={{
              mt: 3,
              mb: 2,
              bgcolor: COLORS.accent,
              color: COLORS.secondary,
              textTransform: 'none',
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: COLORS.primary,
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease-in-out',
              },
            }}
          >
            Update Account
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Account;
