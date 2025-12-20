import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import useEmblaCarousel from 'embla-carousel-react';
import RegistrationsImage from '../../assests/Images/Registrations.png';
import TransactionsImage from '../../assests/Images/Transactions.png';

const SLIDES = [
  {
    image: RegistrationsImage,
    alt: 'Dashboard showing insider trading registrations with detailed analytics',
  },
  {
    image: TransactionsImage,
    alt: 'Dashboard displaying insider trading transactions and market data',
  },
];

// Detect small screens for autoplay control
const useIsSmallScreen = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640); // sm breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return isSmallScreen;
};

const Hero = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 20 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isSmallScreen = useIsSmallScreen();

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

  // Auto-advance every 4 seconds (disabled on small screens for performance)
  useEffect(() => {
    if (!emblaApi || isSmallScreen) return;

    const autoplay = setInterval(() => {
      if (emblaApi) {
        emblaApi.scrollNext();
      }
    }, 4000);

    return () => clearInterval(autoplay);
  }, [emblaApi, isSmallScreen]);

  return (
    <section className="relative pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-20 md:pb-28 overflow-hidden bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-12 lg:gap-16">
          {/* Left Content */}
          <div className="flex-1 w-full lg:max-w-[55%] text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 sm:mb-6 leading-tight font-display">
              Unlock the Power of{' '}
              <span className="text-primary-strong">
                Insider Trading Insights
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed font-normal max-w-2xl mx-auto lg:mx-0">
              Make informed investment decisions with real-time tracking of insider trading activities. Get ahead of the market with professional-grade analytics and insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 bg-primary-strong hover:bg-primary-strong/90 w-full sm:w-auto"
              >
                <Link to="/signup">Get Started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 w-full sm:w-auto"
              >
                <Link to="/features">Learn More</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - Image Carousel Card */}
          <div className="flex-1 w-full flex justify-center items-center">
            <div className="relative w-full max-w-2xl bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-lg p-3 sm:p-4 md:p-6">
              {/* Premium Background Container with Subtle Depth */}
              <div className="relative w-full aspect-[16/10] rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-muted/40 to-background border border-border/40">
                {/* Subtle inner glow for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-background/10 pointer-events-none" aria-hidden="true" />
                
                {/* Embla Carousel */}
                <div 
                  className="relative overflow-hidden h-full w-full" 
                  ref={emblaRef}
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Dashboard preview carousel"
                >
                  <div className="flex h-full">
                    {SLIDES.map((slide, index) => (
                      <div
                        key={index}
                        id={`slide-${index}`}
                        role="tabpanel"
                        aria-roledescription="slide"
                        aria-label={`Slide ${index + 1} of ${SLIDES.length}`}
                        className="flex-[0_0_100%] min-w-0 relative flex items-center justify-center p-2 sm:p-4 md:p-6"
                      >
                        <img
                          src={slide.image}
                          alt={slide.alt}
                          width="800"
                          height="500"
                          className="w-full h-full max-w-full max-h-full object-contain drop-shadow-lg will-change-[opacity]"
                          style={{ 
                            aspectRatio: '16 / 10',
                            objectFit: 'contain',
                          }}
                          loading={index === 0 ? "eager" : "lazy"}
                          decoding={index === 0 ? "sync" : "async"}
                          fetchPriority={index === 0 ? "high" : "low"}
                          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 600px"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Indicator Dots */}
              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Carousel slides">
                {SLIDES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    role="tab"
                    aria-selected={selectedIndex === index}
                    aria-controls={`slide-${index}`}
                    className={`
                      h-2.5 sm:h-2 rounded-full transition-all duration-300 ease-out touch-manipulation
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2
                      ${
                        selectedIndex === index
                          ? 'w-8 sm:w-8 bg-primary-strong'
                          : 'w-2.5 sm:w-2 bg-muted hover:bg-muted-foreground/50'
                      }
                    `}
                    style={{ minHeight: '44px', minWidth: '44px', padding: '20px 10px' }}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>

              {/* Caption */}
              <p className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-muted-foreground font-medium">
                Real-time Market Analytics
              </p>
              
              {/* Autoplay status indicator for screen readers */}
              <div className="sr-only" role="status" aria-live="polite">
                {isSmallScreen 
                  ? 'Carousel autoplay disabled on mobile for better performance' 
                  : 'Carousel auto-advances every 4 seconds'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
