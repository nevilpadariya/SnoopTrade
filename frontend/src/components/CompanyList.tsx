import React from 'react';
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';

interface CompanyListProps {
  companies: string[];
  onSelectCompany: (company: string) => void;
}

const CompanyList: React.FC<CompanyListProps> = ({ companies, onSelectCompany }) => {
  return (
    <List>
      {companies.map((company) => (
        <ListItem key={company} disablePadding>
          <ListItemButton onClick={() => onSelectCompany(company)}>
            <ListItemText primary={company} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};

export default CompanyList;