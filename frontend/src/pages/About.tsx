import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import Navbar from '../components/Navbar';
import FeatureList from '../components/about/FeatureList';
import TeamMembers from '../components/about/TeamMembers';
import ArchitectureDiagram from '../components/about/ArchitectureDiagram';

const AboutPage = () => {
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
            About Our Project
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
            Learn more about the vision, technology, and team behind our insider trading analysis platform.
          </Typography>

          <FeatureList />

          <ArchitectureDiagram />

          <Typography
            variant="h2"
            align="center"
            sx={{
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
              color: 'white',
              mb: 4,
            }}
          >
            Meet the Team
          </Typography>

          <TeamMembers />
        </Container>
      </Box>
    </>
  );
};

export default AboutPage;