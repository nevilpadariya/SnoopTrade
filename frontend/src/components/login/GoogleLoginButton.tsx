import React from 'react';
import { Box } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onSuccess: (response: any) => void;
  onError: () => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      '& > div': { 
        width: '100% !important',
        transition: 'transform 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
        }
      } 
    }}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        theme="outline"
        text="signin_with"
        shape="rectangular"
        logo_alignment="center"
        width="100%"
      />
    </Box>
  );
};

export default GoogleLoginButton;