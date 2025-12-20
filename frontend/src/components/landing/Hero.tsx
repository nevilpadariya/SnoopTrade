import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import RegistrationsImage from '../../assests/Images/Registrations.png';
import TransactionsImage from '../../assests/Images/Transactions.png';

const SLIDES = [
  {
    image: RegistrationsImage,
    alt: 'Insider Trading Registrations Dashboard',
  },
  {
    image: TransactionsImage,
    alt: 'Insider Trading Transactions Analytics',
  },
];

const Hero = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 20 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (!emblaApi) return;

    const autoplay = setInterval(() => {
      if (emblaApi) {
        emblaApi.scrollNext();
      }
    }, 4000);

    return () => clearInterval(autoplay);
  }, [emblaApi]);

  return (
    <section className="relative pt-32 md:pt-40 pb-20 md:pb-28 overflow-hidden bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* Left Content */}
          <div className="flex-1 max-w-full md:max-w-[60%]">
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight font-display">
              Unlock the Power of{' '}
              <span className="text-primary-strong">
                Insider Trading Insights
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed font-normal">
              Make informed investment decisions with real-time tracking of insider trading activities. Get ahead of the market with professional-grade analytics and insights.
            </p>

            <div className="flex gap-4 flex-wrap">
              <Button
                asChild
                size="lg"
                className="text-lg px-8 py-6 bg-primary-strong hover:bg-primary-strong/90"
              >
                <Link to="/signup">Get Started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
              >
                <Link to="/features">Learn More</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - Image Carousel Card */}
          <div className="flex-1 flex justify-center items-center relative w-full">
            <div className="relative w-full bg-card rounded-2xl overflow-hidden border border-border shadow-lg p-6">
              {/* Premium Background Container with Subtle Depth */}
              <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-muted/40 to-background border border-border/40">
                {/* Subtle inner glow for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-background/10 pointer-events-none" />
                
                {/* Embla Carousel */}
                <div className="relative overflow-hidden h-full" ref={emblaRef}>
                  <div className="flex h-full">
                    {SLIDES.map((slide, index) => (
                      <div
                        key={index}
                        className="flex-[0_0_100%] min-w-0 relative flex items-center justify-center p-6"
                      >
                        <img
                          src={slide.image}
                          alt={slide.alt}
                          className="w-full h-full object-contain drop-shadow-lg transition-opacity duration-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Indicator Dots */}
              <div className="mt-6 flex items-center justify-center gap-2">
                {SLIDES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    className={`
                      h-2 rounded-full transition-all duration-300 ease-out
                      ${
                        selectedIndex === index
                          ? 'w-8 bg-primary-strong'
                          : 'w-2 bg-muted hover:bg-muted-foreground/50'
                      }
                    `}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Caption */}
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground font-medium">
                  Real-time Market Analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
