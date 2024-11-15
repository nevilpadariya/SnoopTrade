import React from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { Search } from '@mui/icons-material';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange }) => (
  <TextField
    variant="outlined"
    placeholder="Search for a company"
    value={searchTerm}
    onChange={onSearchChange}
    sx={{
      backgroundColor: 'white',
      borderRadius: 2,
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      width: '100%',
    }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <IconButton>
            <Search />
          </IconButton>
        </InputAdornment>
      ),
    }}
    fullWidth
  />
);

export default SearchBar;
