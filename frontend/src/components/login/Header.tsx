import React from 'react';
import { Box, Typography } from '@mui/material';
import logo from '../../assests/Images/Logo.png';

const Header: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: '#c2b0b030',
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        position: 'fixed',
      }}
    >
      <Box display="flex" alignItems="center" margin={'16px 0px'}>
        <img src={logo} alt="Logo" style={{ height: 50, marginRight: 10 }} />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 'bold',
            color: '#F3F6F8',
            textShadow: '2px 2px 5px rgba(0, 0, 0, 0.8)',
          }}
        >
          SnoopTrade
        </Typography>
      </Box>
    </div>
  );
};

export default Header;
