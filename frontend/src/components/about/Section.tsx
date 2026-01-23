import React from 'react';

interface SectionProps {
  title: string;
  content: string;
}

const Section: React.FC<SectionProps> = ({ title, content }) => {
  return (
    <section className="mb-10 sm:mb-12 md:mb-16">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6 font-display">
        {title}
      </h2>
      <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-4xl">
        {content}
      </p>
    </section>
  );
};

export default Section;
