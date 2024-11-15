// src/pages/Account.tsx
import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Paper, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Helmet } from 'react-helmet';

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

  // Fetch user data
  const fetchUserData = async () => {
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/me', {
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
  const validatePassword = (password: string) => (password.length >= 6 ? '' : 'Password must be at least 6 characters');
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

        // Prepare the data to be sent in the update request
        const updateData: any = { name };
        if (password) {
          updateData.password = password;
        }

        const response = await fetch('http://127.0.0.1:8000/auth/me/update', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          alert('Account details updated!');
          setPassword(''); // Clear password fields
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
        email: '', // No error for email, as it shouldn't be editable
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" bgcolor="#f0f4f8">
      <Helmet>
        <title>Account | SnoopTrade</title>
      </Helmet>
      <Paper elevation={3} style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
        <Typography variant="h4" gutterBottom align="center">
          Account Settings
        </Typography>

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
          disabled // Disable editing email
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
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
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
                <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          style={{ marginTop: '1rem' }}
          onClick={handleSubmit}
        >
          Update Account
        </Button>
      </Paper>
    </Box>
  );
};

export default Account;
