import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Typography, useScrollTrigger } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart } from 'lucide-react';
import { useAuth } from '../contex/AuthContext';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsScrolled(trigger);
  }, [trigger]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const showAccountButton = ['/dashboard', '/about', '/features'].includes(location.pathname);

  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        backgroundColor: isScrolled ? 'rgba(0, 0, 0, 0.85)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        transition: 'all 0.3s ease-in-out',
        boxShadow: isScrolled ? '0 2px 20px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
          }}
        >
          <Box
            component={Link}
            to={token ? "/dashboard" : "/"}
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'white',
            }}
          >
            <BarChart size={32} color="#73C2A0" strokeWidth={2} />
            <Typography
              variant="h5"
              sx={{
                ml: 2,
                fontWeight: 700,
                background: 'linear-gradient(45deg, #F3F6F8 30%, #73C2A0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SnoopTrade
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Button
              component={Link}
              to="/about"
              sx={{
                color: 'white',
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': { color: '#73C2A0' },
              }}
            >
              About
            </Button>
            <Button
              component={Link}
              to="/features"
              sx={{
                color: 'white',
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': { color: '#73C2A0' },
              }}
            >
              Features
            </Button>
            {showAccountButton && (
              <Button
                component={Link}
                to="/account"
                sx={{
                  color: 'white',
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': { color: '#73C2A0' },
                }}
              >
                Account
              </Button>
            )}
            {token ? (
              <Button
                onClick={handleLogout}
                variant="contained"
                sx={{
                  backgroundColor: '#73C2A0',
                  color: 'white',
                  textTransform: 'none',
                  fontSize: '1rem',
                  px: 4,
                  py: 1,
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: '#5DA583',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(115, 194, 160, 0.4)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                Logout
              </Button>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/login"
                  variant="text"
                  sx={{
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '1rem',
                    '&:hover': { color: '#73C2A0' },
                  }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/signup"
                  variant="contained"
                  sx={{
                    backgroundColor: '#73C2A0',
                    color: 'white',
                    textTransform: 'none',
                    fontSize: '1rem',
                    px: 4,
                    py: 1,
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: '#5DA583',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(115, 194, 160, 0.4)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Navbar;
