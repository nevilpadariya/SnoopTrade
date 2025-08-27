import React from 'react';
import { Avatar, Card, CardContent, Link, Typography } from '@mui/material';

interface TeamMember {
    name: string;
    role: string;
    photo: string;
    email: string;
    contact: string;
    linkedIn: string;
    description: string;
    skills: string[];
}

const TeamMemberCard: React.FC<TeamMember> = ({ name, role, photo, email, contact, linkedIn, description, skills }) => {
    return (
        <Card
            sx={{
                textAlign: 'center',
                p: 4,
                background: 'linear-gradient(135deg, rgba(115, 194, 160, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
                borderRadius: '16px',
                boxShadow: '0px 6px 18px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.3s',
                '&:hover': {
                    transform: 'scale(1.05)',
                },
            }}
        >
            <CardContent>
                <Avatar
                    alt={name}
                    src={photo}
                    sx={{ width: 100, height: 100, mb: 2, mx: 'auto' }}
                />
                <Typography
                    variant="h6"
                    sx={{
                        color: 'white',
                        fontWeight: 600,
                        mb: 2,
                    }}
                >
                    {name}
                </Typography>
                <Typography
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: 1.6,
                    }}
                >
                    {role}
                </Typography>
                <Typography
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: 1.6,
                        mt: 1,
                        textAlign: 'left',
                    }}
                >
                    {description}
                </Typography>
                <Typography
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: 1.6,
                        mt: 1,
                        textAlign: 'left',
                    }}
                >
                    <strong>Email:</strong> {email}
                </Typography>
                <Typography
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: 1.6,
                        mt: 1,
                        textAlign: 'left',
                    }}
                >
                    <strong>Contact:</strong> {contact}
                </Typography>
                <Typography
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: 1.6,
                        mt: 1,
                        textAlign: 'left',
                    }}
                >
                    <strong>LinkedIn:</strong>{' '}
                    <Link
                        href={linkedIn}
                        target="_blank"
                        sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                        {linkedIn}
                    </Link>
                </Typography>
                <Typography
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        lineHeight: 1.6,
                        mt: 1,
                        textAlign: 'left',
                    }}
                >
                    <strong>Skills:</strong>
                    <ul>
                        {skills.map((skill, skillIndex) => (
                            <li key={skillIndex}>{skill}</li>
                        ))}
                    </ul>
                </Typography>
            </CardContent>
        </Card>
    );
};

export default TeamMemberCard;
