import React from 'react';
import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';

interface CompanyListProps {
  companies: string[];
  onSelectCompany: (company: string) => void;
}

const CompanyList: React.FC<CompanyListProps> = ({ companies, onSelectCompany }) => (
  <List style={{ width: '100%', maxWidth: '400px', backgroundColor: '#fff', marginTop: '1rem', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
    {companies.map((company) => (
      <ListItem key={company} disablePadding>
        <ListItemButton onClick={() => onSelectCompany(company)}>
          <ListItemText primary={company} />
        </ListItemButton>
      </ListItem>
    ))}
  </List>
);

export default CompanyList;
