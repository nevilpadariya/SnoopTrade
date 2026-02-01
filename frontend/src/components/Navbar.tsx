import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import Logo from './Logo';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { token, setToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const showAccountButton = ['/dashboard', '/about', '/features'].includes(location.pathname);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen || !mobileMenuRef.current) return;

    const menu = mobileMenuRef.current;
    const focusableElements = menu.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    firstElement?.focus();

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-strong focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b",
          isScrolled
            ? "bg-card/95 backdrop-blur-md shadow-lg border-border"
            : "bg-transparent border-transparent"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link
              to={token ? "/dashboard" : "/"}
              className="flex items-center gap-2 md:gap-3 text-foreground no-underline hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
              aria-label="SnoopTrade home"
            >
              <Logo className="h-7 w-7 md:h-8 md:w-8 text-primary-strong flex-shrink-0" />
              <span className="text-lg md:text-xl font-bold font-display truncate">
                SnoopTrade
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-2 xl:gap-4">
              <Button
                asChild
                variant="ghost"
                className="hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11"
              >
                <Link to="/about">About</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11"
              >
                <Link to="/features">Features</Link>
              </Button>
              {showAccountButton && (
                <Button
                  asChild
                  variant="ghost"
                  className="hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11"
                >
                  <Link to="/account">Account</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11 w-11"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
              </Button>

              {token ? (
                <Button
                  onClick={handleLogout}
                  variant="default"
                  className="px-6 bg-primary-strong hover:bg-primary-strong/90 focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11"
                >
                  Logout
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    className="hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11"
                  >
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button
                    asChild
                    variant="default"
                    className="px-6 bg-primary-strong hover:bg-primary-strong/90 focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11"
                  >
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11 w-11"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
              </Button>

              <Button
                ref={menuToggleRef}
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-11 w-11"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <X size={24} aria-hidden="true" />
                ) : (
                  <Menu size={24} aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <div
          id="mobile-menu"
          ref={mobileMenuRef}
          role="dialog"
          aria-modal={isMobileMenuOpen ? "true" : undefined}
          aria-label="Mobile navigation menu"
          className={cn(
            "lg:hidden fixed inset-x-0 top-16 md:top-20 bg-card border-b border-border shadow-lg transition-all duration-300 ease-in-out overflow-hidden",
            isMobileMenuOpen
              ? "max-h-screen opacity-100"
              : "max-h-0 opacity-0 pointer-events-none"
          )}
        >
          <div className="container mx-auto px-4 py-6 space-y-3" role="menu">
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-12"
              onClick={closeMobileMenu}
            >
              <Link to="/about" role="menuitem">About</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-12"
              onClick={closeMobileMenu}
            >
              <Link to="/features" role="menuitem">Features</Link>
            </Button>
            {showAccountButton && (
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-12"
                onClick={closeMobileMenu}
              >
                <Link to="/account" role="menuitem">Account</Link>
              </Button>
            )}

            <div className="pt-4 border-t border-border space-y-3">
              {token ? (
                <Button
                  onClick={handleLogout}
                  variant="default"
                  className="w-full bg-primary-strong hover:bg-primary-strong/90 focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-12 text-base"
                  role="menuitem"
                >
                  Logout
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full justify-start text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-12"
                    onClick={closeMobileMenu}
                  >
                    <Link to="/login" role="menuitem">Login</Link>
                  </Button>
                  <Button
                    asChild
                    variant="default"
                    className="w-full bg-primary-strong hover:bg-primary-strong/90 focus-visible:ring-2 focus-visible:ring-primary-strong focus-visible:ring-offset-2 h-12 text-base"
                    onClick={closeMobileMenu}
                  >
                    <Link to="/signup" role="menuitem">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
