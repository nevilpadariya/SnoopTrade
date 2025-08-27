import React from 'react';
import { Grid } from '@mui/material';
import TeamMemberCard from './TeamMemberCard';

const teamMembers = [
  {
    name: 'Nevil Padariya',
    role: 'Frontend Engineer',
    photo: '/utils/nevil.jpg',
    email: 'nevil@example.com',
    contact: '+1234567890',
    linkedIn: 'https://www.linkedin.com/in/nevil-padariya/',
    description:
      'Nevil is a skilled frontend engineer with a passion for creating intuitive and responsive user interfaces.',
    skills: ['React', 'JavaScript', 'CSS', 'HTML', 'Responsive Design'],
  },
  {
    name: 'Pratik Korat',
    role: 'Team Lead & Backend Engineer',
    photo: '/utils/Pratik.jpg',
    email: 'pratik@example.com',
    contact: '+0987654321',
    linkedIn: 'https://www.linkedin.com/in/pratik-korat',
    description:
      'Pratik is the team lead and backend engineer, specializing as a machine learning engineer. He ensures the seamless integration of backend services and machine learning models.',
    skills: ['Python', 'FastAPI', 'Machine Learning', 'Data Analysis', 'Project Management'],
  },
  {
    name: 'Nagaraj GK',
    role: 'Data Analyst & Researcher',
    photo: '/utils/nagaraj.jpg',
    email: 'nagaraj@example.com',
    contact: '+1122334455',
    linkedIn: 'https://www.linkedin.com/in/nagsgk/',
    description:
      'Nagaraj is a dedicated data analyst and researcher, responsible for extracting valuable insights from complex datasets.',
    skills: ['Data Analysis', 'Python', 'SQL', 'Research', 'Data Visualization'],
  },
];

const TeamMembers: React.FC = () => {
  return (
    <Grid container spacing={4}>
      {teamMembers.map((member, index) => (
        <Grid item xs={12} sm={4} key={index}>
          <TeamMemberCard {...member} />
        </Grid>
      ))}
    </Grid>
  );
};

export default TeamMembers;