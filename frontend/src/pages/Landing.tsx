import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';

const Landing = () => {
  return (
    <>
      <Helmet>
        <title>SnoopTrade - Insider Trading Insights Platform</title>
        <meta
          name="description"
          content="Make informed investment decisions with real-time insider trading insights and professional-grade analytics. Track SEC filings and market trends."
        />
        <link rel="canonical" href="https://snooptrade.com" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <Hero />
          <Features />
        </main>
      </div>
    </>
  );
};

export default Landing;
