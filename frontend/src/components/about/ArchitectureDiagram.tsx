import React from 'react';
import { Box, Typography, Grid, useTheme, useMediaQuery } from '@mui/material';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
} from '@mui/lab';
import {
    Web,
    Security,
    Storage,
    Update,
} from '@mui/icons-material';
import flowImage from '../../assests/Images/flow.png';


const ArchitectureDiagram: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box
            sx={{
                py: 10,
                px: { xs: 2, md: 6 },
                background: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
                color: 'white',
            }}
        >
            {/* Title Section */}
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
                Project Architecture
            </Typography>


            {/* Architecture Image */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mb: 6,
                }}
            >
                <img
                    src={flowImage}
                    alt="Project Architecture"
                    style={{
                        width: '100%',
                        maxWidth: '800px',
                        borderRadius: '16px',
                        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.4)',
                    }}
                />
            </Box>

            {/* Deployment Features Section */}
            <Grid container spacing={4} justifyContent="center">
                {[
                    {
                        icon: <Web sx={{ fontSize: 64, color: '#4CAF50' }} />,
                        title: 'Frontend Excellence',
                        points: [
                            { text: 'Dynamic React interface deployed with AWS Elastic Beanstalk.', icon: <Web /> },
                            { text: 'Seamless user experiences powered by responsive design.', icon: <Web /> },
                            { text: 'Google Authentication for secure and effortless logins.', icon: <Web /> },
                            { text: 'Auto-Scaling keeps the app smooth under any load.', icon: <Web /> },
                        ],
                    },
                    {
                        icon: <Security sx={{ fontSize: 64, color: '#2196F3' }} />,
                        title: 'Robust Backend',
                        points: [
                            { text: 'FastAPI services inside a secure Virtual Private Cloud.', icon: <Security /> },
                            { text: 'Load balancing for efficient API request management.', icon: <Security /> },
                            { text: 'Auto-Scaling for consistent performance at any scale.', icon: <Security /> },
                            { text: 'Isolated environment enhances security and reliability.', icon: <Security /> },
                        ],
                    },
                    {
                        icon: <Storage sx={{ fontSize: 64, color: '#FF9800' }} />,
                        title: 'Secure Data Storage',
                        points: [
                            { text: 'MongoDB database for robust data management.', icon: <Storage /> },
                            { text: 'Encrypted communication ensures data security.', icon: <Storage /> },
                            { text: 'Efficient storage of insider trading insights.', icon: <Storage /> },
                            { text: 'Real-time data updates enhance decision-making.', icon: <Storage /> },
                        ],
                    },
                    {
                        icon: <Update sx={{ fontSize: 64, color: '#FF9800' }} />,
                        title: 'Automated Workflows',
                        points: [
                            { text: 'Daily data extraction from SEC Edgar API.', icon: <Update /> },
                            { text: 'Regular stock data updates to keep insights fresh.', icon: <Update /> },
                            { text: 'Kubernetes Cron Jobs for reliable task automation.', icon: <Update /> },
                            { text: 'Scalable workflows optimized for performance.', icon: <Update /> },
                        ],
                    },
                ].map(({ icon, title, points }, index) => (
                    <Grid item xs={12} md={6} key={index}>
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
                                {points.map((item, index) => (
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
                                            {index < points.length - 1 && (
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
                    </Grid>
                ))}

            </Grid>
        </Box>
    );
};

export default ArchitectureDiagram;
