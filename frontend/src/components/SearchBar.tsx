import React from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
      <Input
        type="text"
        placeholder="Search for a company..."
        value={searchTerm}
        onChange={onSearchChange}
        className="pl-12 h-14 text-lg bg-card border-border focus:ring-2 focus:ring-primary"
      />
    </div>
  );
};

export default SearchBar;
