import React from 'react';
import { Box } from '@mui/material';
import { Helmet } from 'react-helmet';
import Navbar from '../components/Navbar';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';

const Landing = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9))',
      }}
    >
      <Helmet>
        <title>SnoopTrade - Insider Trading Insights Platform</title>
        <meta
          name="description"
          content="Make informed investment decisions with real-time insider trading insights and professional-grade analytics."
        />
      </Helmet>

      <Navbar />
      <Hero />
      <Features />
    </Box>
  );
};

export default Landing;