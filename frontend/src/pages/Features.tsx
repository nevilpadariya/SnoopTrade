import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '../components/Navbar';
import { 
  LineChart, 
  Bell, 
  Shield, 
  TrendingUp, 
  BarChart2, 
  Search,
  Zap,
  Database,
  Lock
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

const featuresData = [
  {
    icon: <LineChart size={40} aria-hidden="true" />,
    title: 'Real-Time Tracking',
    description: 'Monitor insider trading activities as they happen with our advanced tracking system and instant data updates.',
  },
  {
    icon: <Bell size={40} aria-hidden="true" />,
    title: 'Smart Alerts',
    description: 'Get instant notifications about significant insider trading movements that matter to your portfolio.',
  },
  {
    icon: <Shield size={40} aria-hidden="true" />,
    title: 'Secure Platform',
    description: 'Your data is protected with enterprise-grade security measures and encryption protocols.',
  },
  {
    icon: <TrendingUp size={40} aria-hidden="true" />,
    title: 'Market Analysis',
    description: 'Access comprehensive market analysis, trading patterns, and predictive insights for better decisions.',
  },
  {
    icon: <BarChart2 size={40} aria-hidden="true" />,
    title: 'Advanced Analytics',
    description: 'Leverage powerful analytics tools including ML-powered forecasting and trend analysis.',
  },
  {
    icon: <Search size={40} aria-hidden="true" />,
    title: 'Deep Insights',
    description: 'Gain valuable insights from our extensive database of trading activities spanning years of data.',
  },
  {
    icon: <Zap size={40} aria-hidden="true" />,
    title: 'Lightning Fast',
    description: 'Experience blazing fast performance with our optimized infrastructure and real-time data processing.',
  },
  {
    icon: <Database size={40} aria-hidden="true" />,
    title: 'Extensive Database',
    description: 'Access millions of historical trades and SEC filings with advanced search and filtering capabilities.',
  },
  {
    icon: <Lock size={40} aria-hidden="true" />,
    title: 'Privacy First',
    description: 'We never share your data. Your trading strategies and watchlists remain completely private.',
  },
];

const Features: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Features | SnoopTrade - Insider Trading Analytics Platform</title>
        <meta
          name="description"
          content="Explore SnoopTrade's powerful features: real-time tracking, smart alerts, advanced analytics, and comprehensive insider trading insights."
        />
        <link rel="canonical" href="https://snooptrade.com/features" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main id="main-content">
          <div className="container mx-auto px-4 lg:px-8 pt-20 pb-16">
            <div className="text-center mb-16 pt-12">
              <h1 className="text-5xl md:text-6xl font-extrabold text-foreground mb-6 font-display">
                Powerful Features for <span className="text-primary-strong">Smart Trading</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to track insider trading activities and make informed investment decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {featuresData.map((feature, index) => (
                <Card
                  key={index}
                  className="relative overflow-hidden group p-8 h-full bg-card hover:-translate-y-2 transition-all duration-300 border-border hover:shadow-xl"
                >
                  {/* Top overline reveal on hover */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left" aria-hidden="true" />
                  
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="inline-flex p-4 rounded-xl bg-primary/20 text-primary-strong mb-6 w-fit">
                      {feature.icon}
                    </div>
                    <h2 className="text-2xl font-semibold text-card-foreground mb-4 font-display">
                      {feature.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed flex-1">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Features;
