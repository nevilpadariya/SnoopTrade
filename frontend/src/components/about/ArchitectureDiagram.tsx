import React from 'react';
import { 
  Cloud, 
  Database, 
  Server,
  Monitor,
  Shield,
  Zap
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const architectureComponents = [
  {
    icon: <Monitor size={32} />,
    title: 'React Frontend',
    description: 'Modern, responsive UI built with React, TypeScript, and Tailwind CSS.',
  },
  {
    icon: <Server size={32} />,
    title: 'FastAPI Backend',
    description: 'High-performance Python backend with REST API endpoints.',
  },
  {
    icon: <Database size={32} />,
    title: 'PostgreSQL Database',
    description: 'Reliable relational database for storing trades and user data.',
  },
  {
    icon: <Cloud size={32} />,
    title: 'Cloud Infrastructure',
    description: 'Scalable deployment on AWS/GCP with containerized services.',
  },
  {
    icon: <Zap size={32} />,
    title: 'Real-Time Processing',
    description: 'Automated SEC filing scraping and data pipeline for instant updates.',
  },
  {
    icon: <Shield size={32} />,
    title: 'Security Layer',
    description: 'JWT authentication and OAuth 2.0 for secure user access.',
  },
];

const ArchitectureDiagram: React.FC = () => {
  return (
    <div className="mb-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {architectureComponents.map((component, index) => (
          <Card
            key={index}
            className="relative overflow-hidden group p-6 bg-card border-border hover:-translate-y-2 transition-transform duration-300"
          >
            {/* Top overline reveal on hover */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            
            <CardContent className="p-0">
              <div className="inline-flex p-3 rounded-xl bg-primary/20 text-primary-strong mb-4">
                {component.icon}
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-3 font-display">
                {component.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {component.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
