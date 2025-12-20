import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '../components/Navbar';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>SnoopTrade - Insider Trading Insights Platform</title>
        <meta
          name="description"
          content="Make informed investment decisions with real-time insider trading insights and professional-grade analytics."
        />
      </Helmet>

      <Navbar />
      <Hero />
      <Features />
    </div>
  );
};

export default Landing;
