import React from 'react';
import { 
  TrendingUp, 
  Database, 
  BarChart2, 
  LineChart,
  Activity,
  Shield
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const features = [
  {
    icon: <TrendingUp size={32} />,
    title: 'Real-Time Tracking',
    description: 'Monitor insider trades as they are filed with the SEC.',
  },
  {
    icon: <Database size={32} />,
    title: 'Comprehensive Data',
    description: 'Access historical and current insider trading data across all public companies.',
  },
  {
    icon: <BarChart2 size={32} />,
    title: 'Advanced Analytics',
    description: 'Leverage machine learning models for predictive insights and trend analysis.',
  },
  {
    icon: <LineChart size={32} />,
    title: 'Visual Dashboards',
    description: 'Interactive charts and graphs for easy data interpretation.',
  },
  {
    icon: <Activity size={32} />,
    title: 'Custom Alerts',
    description: 'Set personalized notifications for specific companies or trading patterns.',
  },
  {
    icon: <Shield size={32} />,
    title: 'Secure & Private',
    description: 'Your data and trading strategies remain completely confidential.',
  },
];

const FeatureList: React.FC = () => {
  return (
    <div className="mb-10 sm:mb-12 md:mb-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {features.map((feature, index) => (
          <Card
            key={index}
            className="relative overflow-hidden group p-4 sm:p-6 bg-card border-border hover:-translate-y-2 transition-transform duration-300"
          >
            {/* Top overline reveal on hover */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" />
            
            <CardContent className="p-0">
              <div className="inline-flex p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-primary/20 text-primary-strong mb-3 sm:mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-card-foreground mb-2 sm:mb-3 font-display">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FeatureList;
