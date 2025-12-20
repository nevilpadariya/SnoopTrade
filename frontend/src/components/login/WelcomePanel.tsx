import React from 'react';
import { TrendingUp, Lock, LineChart } from 'lucide-react';

const WelcomePanel: React.FC = () => {
  const features = [
    {
      icon: <TrendingUp size={28} className="text-primary-strong" />,
      text: 'Track real-time market insights',
    },
    {
      icon: <Lock size={28} className="text-primary-strong" />,
      text: 'Secure and reliable trading platform',
    },
    {
      icon: <LineChart size={28} className="text-primary-strong" />,
      text: 'Advanced analytics and reporting',
    },
  ];

  return (
    <div className="flex-1 flex flex-col justify-center p-12 bg-muted text-card-foreground relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="text-4xl font-bold mb-10 font-display text-foreground">
          Welcome to SnoopTrade
        </h2>

        <div className="space-y-6">
          {features.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 transform transition-transform hover:translate-x-3 duration-300"
            >
              <div className="p-3 rounded-full bg-primary/20">
                {item.icon}
              </div>
              <p className="text-lg text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomePanel;
