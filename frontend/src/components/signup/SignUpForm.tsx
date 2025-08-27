import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  Paper,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface SignUpFormProps {
  onSubmit: (name: string, email: string, password: string, confirmPassword: string) => void;
  error: string;
  errors: { name?: string; email?: string; password?: string; confirmPassword?: string };
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, error, errors }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameValidationTriggered, setNameValidationTriggered] = useState(false);

  // Function to check if the name contains both first and last names
  const isFullNameValid = (name: string) => {
    const parts = name.trim().split(' ');
    return parts.length >= 2 && parts.every((part) => part.length > 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Trigger validation on name field before allowing sign up
    setNameValidationTriggered(true);

    if (!isFullNameValid(name)) {
      return; // Do not proceed if the name is invalid
    }

    onSubmit(name, email, password, confirmPassword);
  };

  return (
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
          onFocus={() => setNameValidationTriggered(true)}
          error={!!errors.name || (nameValidationTriggered && !isFullNameValid(name))}
          helperText={
            errors.name ||
            (nameValidationTriggered && !isFullNameValid(name) && 'Please enter both first and last names.')
          }
        />
        <TextField
          label="Email"
          type="email"
          variant="outlined"
          margin="normal"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={!!errors.email}
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
          error={!!errors.password}
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
          error={!!errors.confirmPassword}
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
        {error && (
          <Typography color="error" variant="body2" align="center" gutterBottom>
            {error}
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
    </Paper>
  );
};

export default SignUpForm;
