import React from 'react';
import { Box, Container, Grid, Typography } from '@mui/material';
import { TrendingUp, Shield, BarChart2, ChartBar, LineChart, Search } from 'lucide-react';
import Navbar from '../components/Navbar';

const extendedFeatures = [
  {
    icon: <TrendingUp size={32} />,
    title: 'Trend Prediction',
    description: 'Use AI-driven models to predict market trends based on insider trading data.',
  },
  {
    icon: <Shield size={32} />,
    title: 'Data Protection',
    description: 'Benefit from our secure environment that protects sensitive trading data.',
  },
  {
    icon: <BarChart2 size={32} />,
    title: 'Custom Analytics',
    description: 'Create custom dashboards to analyze insider trading metrics that matter to you.',
  },
  {
    icon: <ChartBar size={32} />,
    title: 'Sector Performance',
    description: 'Compare insider trading activities across different market sectors.',
  },
  {
    icon: <LineChart size={32} />,
    title: 'Live Data Feeds',
    description: 'Access live data streams to stay updated with real-time market changes.',
  },
  {
    icon: <Search size={32} />,
    title: 'Historical Insights',
    description: 'Explore historical insider trading data for better decision-making.',
  },
];

const FeaturesPage = () => {
  return (
    <>
      <Navbar />
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)',
          minHeight: '100vh',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'white',
              mb: 2,
            }}
          >
            Explore Exclusive Features
          </Typography>
          <Typography
            variant="h6"
            align="center"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              mb: 8,
              maxWidth: '800px',
              mx: 'auto',
            }}
          >
            Leverage advanced tools and insights to make well-informed investment decisions.
          </Typography>

          <Grid container spacing={4}>
            {extendedFeatures.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box
                  sx={{
                    p: 4,
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
                    borderRadius: '16px',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      p: 2,
                      borderRadius: '12px',
                      backgroundColor: 'rgba(115, 194, 160, 0.1)',
                      color: '#73C2A0',
                      mb: 3,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'white',
                      fontWeight: 600,
                      mb: 2,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default FeaturesPage;
