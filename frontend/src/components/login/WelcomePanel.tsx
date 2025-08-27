import React from 'react';
import { Box, Typography } from '@mui/material';
import { TrendingUp, Lock, Timeline } from '@mui/icons-material';

const WelcomePanel: React.FC = () => {
  return (
    <Box
      flex={1}
      display="flex"
      flexDirection="column"
      justifyContent="center"
      p={6}
      sx={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(33, 33, 33, 0.9) 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 30%, rgba(115, 194, 160, 0.1) 0%, transparent 70%)',
        },
      }}
    >
      <Typography 
        variant="h4" 
        fontWeight="bold" 
        gutterBottom 
        sx={{ 
          color: 'white',
          marginBottom: 4,
          position: 'relative',
        }}
      >
        Welcome to SnoopTrade
      </Typography>
      
      {[
        {
          icon: <TrendingUp sx={{ fontSize: 28, color: '#73C2A0' }} />,
          text: 'Track real-time market insights',
        },
        {
          icon: <Lock sx={{ fontSize: 28, color: '#73C2A0' }} />,
          text: 'Secure and reliable trading platform',
        },
        {
          icon: <Timeline sx={{ fontSize: 28, color: '#73C2A0' }} />,
          text: 'Advanced analytics and reporting',
        },
      ].map((item, index) => (
        <Box 
          key={index} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 3,
            transform: 'translateX(0)',
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'translateX(10px)',
            }
          }}
        >
          <Box sx={{ 
            marginRight: 2,
            padding: 1,
            borderRadius: '50%',
            backgroundColor: 'rgba(115, 194, 160, 0.1)',
          }}>
            {item.icon}
          </Box>
          <Typography variant="body1" sx={{ color: '#f5f5f5' }}>
            {item.text}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default WelcomePanel;