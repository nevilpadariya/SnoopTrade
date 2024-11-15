import React from 'react';
import { Box, Typography, Button, Divider } from '@mui/material';
import { Dashboard, AccountCircle, Logout } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assests/Images/Logo.png'; // Replace with the actual path to your logo

const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Remove the authentication token
    localStorage.removeItem('authToken');
    // Redirect to login
    navigate('/');
  };

  return (
    <Box
      sx={{
        width: '250px',
        height: '100vh',
        backgroundColor: '#f7f7ff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem',
        boxShadow: '2px 0px 5px rgba(0,0,0,0.1)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      {/* Logo and Title */}
      <Box display="flex" alignItems="center" mb={4}>
        <Link to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img src={logo} alt="SnoopTrade Logo" style={{ width: '40px', height: '40px', marginRight: '8px' }} />
          <Typography variant="h6" color="primary">SnoopTrade</Typography>
        </Link>
      </Box>

      <Divider style={{ width: '100%', marginBottom: '1rem' }} />

      {/* Navigation Buttons */}
      <Button
        component={Link}
        to="/dashboard"
        startIcon={<Dashboard />}
        fullWidth
        variant="text"
        sx={{
          justifyContent: 'flex-start',
          color: '#3c3c4e',
          mb: 1,
          '&:hover': {
            backgroundColor: '#e8eaf6', // Light purple on hover
          },
        }}
      >
        Dashboard
      </Button>

      <Button
        component={Link}
        to="/account"
        startIcon={<AccountCircle />}
        fullWidth
        variant="text"
        sx={{
          justifyContent: 'flex-start',
          color: '#3c3c4e',
          mb: 1,
          '&:hover': {
            backgroundColor: '#e8eaf6',
          },
        }}
      >
        Manage Account
      </Button>

      {/* Logout Button */}
      <Button
        onClick={handleLogout}
        startIcon={<Logout />}
        fullWidth
        variant="text"
        sx={{
          justifyContent: 'flex-start',
          color: '#3c3c4e',
          mb: 1,
          '&:hover': {
            backgroundColor: '#e8eaf6',
          },
        }}
      >
        Logout
      </Button>
    </Box>
  );
};

export default Sidebar;
