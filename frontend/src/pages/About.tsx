import React from 'react';
import { Helmet } from 'react-helmet';
import Navbar from '../components/Navbar';
import Section from '../components/about/Section';
import FeatureList from '../components/about/FeatureList';
import ArchitectureDiagram from '../components/about/ArchitectureDiagram';
import TeamMembers from '../components/about/TeamMembers';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About Us | SnoopTrade</title>
      </Helmet>

      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="text-center pt-6 sm:pt-8 md:pt-12 mb-10 sm:mb-12 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 sm:mb-6 font-display">
            About <span className="text-primary-strong">SnoopTrade</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Empowering investors with real-time insider trading intelligence and advanced analytics.
          </p>
        </div>

        <Section
          title="Our Mission"
          content="SnoopTrade is dedicated to democratizing access to insider trading information. We believe that all investors deserve transparent, real-time insights into market-moving insider activities. Our platform leverages cutting-edge technology to track, analyze, and present SEC filings in an intuitive, actionable format."
        />

        <Section
          title="What We Offer"
          content="Our platform provides comprehensive insider trading data, advanced analytics, and predictive insights. Whether you're a retail investor or institutional trader, SnoopTrade gives you the tools to make informed decisions based on real-time insider activities."
        />

        <FeatureList />

        <Section
          title="Technology & Architecture"
          content="Built with modern cloud-native technologies, SnoopTrade delivers reliable, scalable performance. Our system architecture ensures real-time data processing and seamless user experience."
        />

        <ArchitectureDiagram />

        <Section
          title="Meet Our Team"
          content="We're a team of passionate developers, data scientists, and financial experts committed to bringing transparency to the markets."
        />

        <TeamMembers />
      </div>
    </div>
  );
};

export default About;
