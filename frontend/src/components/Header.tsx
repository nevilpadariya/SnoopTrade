// Updated Header.tsx to make both logo and name clickable and redirect to the landing page
import React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <Box
      sx={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        padding="16px"
        sx={{
          cursor: 'pointer',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <BarChart size={32} color="#73C2A0" strokeWidth={2} />
          <Typography
            variant="h4"
            sx={{
              marginLeft: 2,
              fontWeight: 700,
              background: 'linear-gradient(45deg, #F3F6F8 30%, #73C2A0 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          >
            SnoopTrade
          </Typography>
        </Link>
      </Box>
    </Box>
  );
};

export default Header;
