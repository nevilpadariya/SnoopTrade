import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 w-full z-[1000] bg-card/40 backdrop-blur-md shadow-lg transition-all duration-300 border-b border-border">
      <div className="flex items-center justify-center p-4">
        <Link
          to="/"
          className="flex items-center gap-3 no-underline cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Logo className="h-8 w-8 text-primary-strong" />
          <h1 className="text-3xl font-bold text-foreground font-display">
            SnoopTrade
          </h1>
        </Link>
      </div>
    </header>
  );
};

export default Header;
