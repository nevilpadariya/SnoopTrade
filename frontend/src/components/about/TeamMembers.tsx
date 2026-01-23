import React from 'react';
import TeamMemberCard from './TeamMemberCard';


const teamMembers = [
  {
    name: 'Pratik Korat',
    role: 'Backend Developer and Machine Learning Engineer',
    bio: 'Specializing in machine learning and predictive analytics for financial data.',
    linkedinUrl: 'https://www.linkedin.com/in/pratik-korat/',
  },
  {
    name: 'Nevil Padariya',
    role: 'Full Stack Developer',
    bio: 'Passionate about building scalable systems and creating great user experiences.',
    linkedinUrl: 'https://www.linkedin.com/in/nevil-padariya/',
  },
  {
    name: 'Nagaraj Gireppa Kanni',
    role: 'UI/UX Designer',
    bio: 'Creating intuitive interfaces that make complex data accessible to everyone.',
    linkedinUrl: 'https://www.linkedin.com/in/nagaraj-gireppa-kanni/',
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
          linkedinUrl={member.linkedinUrl}
        />
      ))}
    </div>
  );
};

export default TeamMembers;
