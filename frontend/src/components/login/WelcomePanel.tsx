import React from 'react';
import { Box, Typography } from '@mui/material';

const WelcomePanel: React.FC = () => {
  return (
    <Box
      flex={1}
      display="flex"
      flexDirection="column"
      justifyContent="center"
      p={4}
      sx={{
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
      }}
    >
      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: 'white' }}>
        Welcome to SnoopTrade
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ color: 'white' }}>
        Discover insider trading insights and make smarter investment decisions with our tools and reports.
      </Typography>
    </Box>
  );
};

export default WelcomePanel;
