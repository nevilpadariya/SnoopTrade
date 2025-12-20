import React from 'react';
import TeamMemberCard from './TeamMemberCard';
import PratikImage from '../../utils/Pratik.jpg';

const teamMembers = [
  {
    name: 'Pratik Dhakal',
    role: 'Full Stack Developer',
    bio: 'Passionate about building scalable systems and creating great user experiences.',
    avatarUrl: PratikImage,
    linkedinUrl: 'https://www.linkedin.com/in/pratik-dhakal',
  },
  {
    name: 'Team Member 2',
    role: 'Data Scientist',
    bio: 'Specializing in machine learning and predictive analytics for financial data.',
    linkedinUrl: '#',
  },
  {
    name: 'Team Member 3',
    role: 'UI/UX Designer',
    bio: 'Creating intuitive interfaces that make complex data accessible to everyone.',
    linkedinUrl: '#',
  },
];

const TeamMembers: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
      {teamMembers.map((member, index) => (
        <TeamMemberCard
          key={index}
          name={member.name}
          role={member.role}
          bio={member.bio}
          avatarUrl={member.avatarUrl}
          linkedinUrl={member.linkedinUrl}
        />
      ))}
    </div>
  );
};

export default TeamMembers;
