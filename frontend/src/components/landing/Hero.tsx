import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { TrendingUp, ChartBar, LineChart } from 'lucide-react';

const Hero = () => {
  return (
    <Box
      sx={{
        pt: { xs: 12, md: 16 },
        pb: { xs: 8, md: 12 },
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
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: { xs: 6, md: 8 },
          }}
        >
          <Box sx={{ flex: 1, maxWidth: { xs: '100%', md: '60%' } }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                fontWeight: 800,
                color: 'white',
                mb: 3,
                lineHeight: 1.2,
              }}
            >
              Unlock the Power of{' '}
              <Box
                component="span"
                sx={{
                  background: 'linear-gradient(45deg, #73C2A0 30%, #A8E6CF 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Insider Trading Insights
              </Box>
            </Typography>

            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                color: 'rgba(255, 255, 255, 0.8)',
                mb: 4,
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Make informed investment decisions with real-time tracking of insider trading activities. Get ahead of the market with professional-grade analytics and insights.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                component={Link}
                to="/signup"
                variant="contained"
                sx={{
                  backgroundColor: '#73C2A0',
                  color: 'white',
                  textTransform: 'none',
                  fontSize: '1.125rem',
                  px: 6,
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#5DA583',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(115, 194, 160, 0.4)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                Get Started
              </Button>
              <Button
                component={Link}
                to="/features"
                variant="outlined"
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  textTransform: 'none',
                  fontSize: '1.125rem',
                  px: 6,
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#73C2A0',
                    color: '#73C2A0',
                    backgroundColor: 'rgba(115, 194, 160, 0.1)',
                  },
                }}
              >
                Learn More
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '400px',
                background: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
                borderRadius: '16px',
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle at center, rgba(115, 194, 160, 0.2) 0%, transparent 70%)',
                },
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
                  <TrendingUp size={48} color="#73C2A0" />
                  <ChartBar size={48} color="#73C2A0" />
                  <LineChart size={48} color="#73C2A0" />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: 500,
                  }}
                >
                  Real-time Market Analytics
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Hero;