import React from 'react';
import { Linkedin, User } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface TeamMemberCardProps {
  name: string;
  role: string;
  bio: string;
  avatarUrl?: string;
  linkedinUrl?: string;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  name,
  role,
  bio,
  avatarUrl,
  linkedinUrl,
}) => {
  return (
    <Card className="relative overflow-hidden group p-6 bg-card border-border hover:-translate-y-2 transition-transform duration-300">
      {/* Top overline reveal on hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
      
      <CardContent className="p-0 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center mb-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User size={40} className="text-muted-foreground" />
          )}
        </div>
        
        <h3 className="text-xl font-semibold text-card-foreground mb-1 font-display">
          {name}
        </h3>
        
        <p className="text-sm text-primary-strong font-medium mb-3">
          {role}
        </p>
        
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          {bio}
        </p>
        
        {linkedinUrl && linkedinUrl !== '#' && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary-strong hover:text-accent transition-colors"
          >
            <Linkedin size={20} />
            <span className="text-sm font-medium">LinkedIn</span>
          </a>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamMemberCard;
