import React from 'react';
import { Box, Typography } from '@mui/material';

interface SectionProps {
    title: string;
    description: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, description }) => {
    return (
        <Box
            sx={{
                textAlign: 'center',
                mb: 8,
                p: 4,
                background: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
                borderRadius: '16px',
            }}
        >
            <Typography
                variant="h4"
                sx={{
                    fontWeight: 700,
                    color: 'white',
                    mb: 2,
                }}
            >
                {title}
            </Typography>
            <Typography
                variant="h6"
                sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    mb: 4,
                }}
            >
                {description}
            </Typography>
        </Box>
    );
};

export default Section;
