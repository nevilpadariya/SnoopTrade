import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../contex/AuthContext';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import Logo from './Logo';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    // Check for saved theme preference or default to light
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
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  const showAccountButton = ['/dashboard', '/about', '/features'].includes(location.pathname);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out border-b",
        isScrolled
          ? "bg-card/95 backdrop-blur-md shadow-lg border-border"
          : "bg-transparent border-transparent"
      )}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link
            to={token ? "/dashboard" : "/"}
            className="flex items-center gap-3 text-foreground no-underline hover:opacity-80 transition-opacity"
          >
            <Logo className="h-8 w-8 text-primary-strong" />
            <span className="text-xl font-bold font-display">
              SnoopTrade
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              className="hover:bg-muted"
            >
              <Link to="/about">About</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="hover:bg-muted"
            >
              <Link to="/features">Features</Link>
            </Button>
            {showAccountButton && (
              <Button
                asChild
                variant="ghost"
                className="hover:bg-muted"
              >
                <Link to="/account">Account</Link>
              </Button>
            )}
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-muted"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            {token ? (
              <Button
                onClick={handleLogout}
                variant="default"
                className="px-6 bg-primary-strong hover:bg-primary-strong/90"
              >
                Logout
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="hover:bg-muted"
                >
                  <Link to="/login">Login</Link>
                </Button>
                <Button
                  asChild
                  variant="default"
                  className="px-6 bg-primary-strong hover:bg-primary-strong/90"
                >
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
