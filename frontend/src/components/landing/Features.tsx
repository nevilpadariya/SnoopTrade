import React from 'react';
import { Box, Container, Grid, Typography } from '@mui/material';
import { 
  LineChart, 
  Bell, 
  Shield, 
  TrendingUp, 
  BarChart2, 
  Search 
} from 'lucide-react';

const features = [
  {
    icon: <LineChart size={32} />,
    title: 'Real-Time Tracking',
    description: 'Monitor insider trading activities as they happen with our advanced tracking system.',
  },
  {
    icon: <Bell size={32} />,
    title: 'Smart Alerts',
    description: 'Get instant notifications about significant insider trading movements.',
  },
  {
    icon: <Shield size={32} />,
    title: 'Secure Platform',
    description: 'Your data is protected with enterprise-grade security measures.',
  },
  {
    icon: <TrendingUp size={32} />,
    title: 'Market Analysis',
    description: 'Access comprehensive market analysis and trading patterns.',
  },
  {
    icon: <BarChart2 size={32} />,
    title: 'Advanced Analytics',
    description: 'Leverage powerful analytics tools to make informed decisions.',
  },
  {
    icon: <Search size={32} />,
    title: 'Deep Insights',
    description: 'Gain valuable insights from our extensive database of trading activities.',
  },
];

const Features = () => {
  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.9) 100%)',
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
          Why Choose SnoopTrade?
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
          Get ahead of the market with our comprehensive suite of trading tools and insights
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
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
  );
};

export default Features;