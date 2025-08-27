import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Box,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  error: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(email, password);
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Email"
        type="email"
        variant="outlined"
        margin="normal"
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#73C2A0',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#73C2A0',
            },
          },
          '& label.Mui-focused': {
            color: '#73C2A0',
          },
        }}
      />
      <TextField
        label="Password"
        type={showPassword ? 'text' : 'password'}
        variant="outlined"
        margin="normal"
        fullWidth
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#73C2A0',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#73C2A0',
            },
          },
          '& label.Mui-focused': {
            color: '#73C2A0',
          },
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                sx={{ color: '#6D727B' }}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {error && (
        <Box sx={{ 
          backgroundColor: 'rgba(211, 47, 47, 0.1)', 
          padding: '8px', 
          borderRadius: '4px',
          marginTop: 1 
        }}>
          <Typography color="error" variant="body2" align="center">
            {error}
          </Typography>
        </Box>
      )}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isLoading}
        sx={{
          backgroundColor: '#73C2A0',
          color: 'white',
          marginTop: 2,
          height: '48px',
          fontSize: '1rem',
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': { 
            backgroundColor: '#5DA583',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(115, 194, 160, 0.4)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {isLoading ? (
          <CircularProgress size={24} sx={{ color: 'white' }} />
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  );
};

export default LoginForm;