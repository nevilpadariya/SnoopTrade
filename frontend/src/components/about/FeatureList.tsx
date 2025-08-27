import React from 'react';
import { Box, Grid, Typography, useTheme, useMediaQuery } from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  Insights,
  Build,
  DataUsage,
  TrendingUp,
  Security,
} from '@mui/icons-material';

const sections = [
  {
    title: 'Project Overview',
    icon: <Insights sx={{ fontSize: 64, color: '#4CAF50' }} />,
    description: [
      { text: 'Comprehensive analysis of SEC EDGAR database', icon: <DataUsage /> },
      { text: 'Advanced tracking of insider trading activities', icon: <Security /> },
      { text: 'Generating actionable financial intelligence', icon: <TrendingUp /> },
      { text: 'Empowering informed investment decisions', icon: <Build /> },
    ],
  },
  {
    title: 'Analytical Approach',
    icon: <Build sx={{ fontSize: 64, color: '#2196F3' }} />,
    description: [
      { text: 'Intelligent processing of SEC filing data', icon: <DataUsage /> },
      { text: 'Advanced pattern and correlation detection', icon: <Insights /> },
      { text: 'Real-time analytics and market insights', icon: <TrendingUp /> },
      { text: 'Proactive investment strategy development', icon: <Security /> },
    ],
  },
  {
    title: 'Machine Learning Innovations',
    icon: <Insights sx={{ fontSize: 64, color: '#FF9800' }} />,
    description: [
      { text: 'Leveraging Facebook Prophet for precise forecasting', icon: <Build /> },
      { text: 'Sophisticated volatility and momentum analysis', icon: <TrendingUp /> },
      { text: 'Advanced predictive modeling techniques', icon: <DataUsage /> },
      { text: 'Integrating EMA and RSI for enhanced accuracy', icon: <Insights /> },
      { text: 'Continuous model refinement through historical data', icon: <Security /> },
      { text: 'Confidence-based prediction optimization', icon: <TrendingUp /> },
    ],
  },
];

const FeatureList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const FeatureItem: React.FC<{
    title: string;
    icon: React.ReactNode;
    description: { text: string; icon: React.ReactNode }[];
  }> = ({ title, icon, description }) => (
    <Box
      sx={{
        p: 4,
        background: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
        borderRadius: '16px',
        mb: 4,
        textAlign: 'center',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s ease',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:hover': {
          transform: 'translateY(-10px)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      }}
    >
      {icon}
      <Typography
        variant="h5"
        sx={{
          color: '#FFFFFF',
          fontWeight: 700,
          mb: 3,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Typography>
      <Timeline position={isMobile ? 'right' : 'right'}>
        {description.map((item, index) => (
          <TimelineItem key={index}>
            <TimelineSeparator>
              <TimelineDot
                variant="outlined"
                sx={{
                  borderColor: 'primary.main',
                  borderWidth: 2,
                  transition: 'all 0.3s ease',
                }}
              >
                {item.icon}
              </TimelineDot>
              {index < description.length - 1 && (
                <TimelineConnector
                  sx={{
                    backgroundColor: 'primary.main',
                    opacity: 0.6,
                  }}
                />
              )}
            </TimelineSeparator>
            <TimelineContent sx={{ py: '12px', px: 2 }}>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 500,
                  lineHeight: 1.6,
                }}
              >
                {item.text}
              </Typography>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Box>
  );

  return (
    <Box
      sx={{
        py: 10,
        px: { xs: 2, md: 6 },
        background: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
        color: 'white',
      }}
    >
      <Typography
        variant="h3"
        component="h2"
        sx={{
          textAlign: 'center',
          fontWeight: 800,
          mb: 6,
          color: '#FFFFFF',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        Explore Our Advanced Features
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} md={6}>
          <FeatureItem
            title={sections[0].title}
            icon={sections[0].icon}
            description={sections[0].description}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FeatureItem
            title={sections[1].title}
            icon={sections[1].icon}
            description={sections[1].description}
          />
        </Grid>
        <Grid item xs={12}>
          <FeatureItem
            title={sections[2].title}
            icon={sections[2].icon}
            description={sections[2].description}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default FeatureList;
