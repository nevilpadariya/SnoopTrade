import React from 'react';
import { 
  LineChart, 
  Bell, 
  Shield, 
  TrendingUp, 
  BarChart2, 
  Search 
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const features = [
  {
    icon: <LineChart size={32} />,
    title: 'Real-Time Tracking',
    description: 'Monitor insider trading activities as they happen with our advanced tracking system.',
  },
  {
    icon: <Bell size={32} />,
    title: 'Smart Alerts',
    description: 'Get instant notifications about significant insider trading movements.',
  },
  {
    icon: <Shield size={32} />,
    title: 'Secure Platform',
    description: 'Your data is protected with enterprise-grade security measures and encryption protocols.',
  },
  {
    icon: <TrendingUp size={32} />,
    title: 'Market Analysis',
    description: 'Access comprehensive market analysis, trading patterns, and predictive insights for better decisions.',
  },
  {
    icon: <BarChart2 size={32} />,
    title: 'Advanced Analytics',
    description: 'Leverage powerful analytics tools including ML-powered forecasting and trend analysis.',
  },
  {
    icon: <Search size={32} />,
    title: 'Deep Insights',
    description: 'Gain valuable insights from our extensive database of trading activities spanning years of data.',
  },
];

const Features = () => {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-foreground mb-3 sm:mb-4 font-display">
          Why Choose <span className="text-primary-strong">SnoopTrade</span>?
        </h2>
        <p className="text-base sm:text-lg text-center text-muted-foreground mb-10 sm:mb-12 md:mb-16 max-w-3xl mx-auto px-4">
          Get ahead of the market with our comprehensive suite of trading tools and insights
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="relative overflow-hidden group p-5 sm:p-6 h-full bg-card hover:-translate-y-2 transition-transform duration-300 border-border"
            >
              {/* Top overline reveal on hover */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" aria-hidden="true" />
              
              <CardContent className="p-0">
                <div className="inline-flex p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-primary/20 text-primary-strong mb-4 sm:mb-6">
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
    </section>
  );
};

export default Features;
