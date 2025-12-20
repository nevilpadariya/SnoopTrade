import React from 'react';
import { Card } from './ui/card';

interface CompanyListProps {
  companies: string[];
  onSelectCompany: (company: string) => void;
}

const CompanyList: React.FC<CompanyListProps> = ({ companies, onSelectCompany }) => {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-card border-border shadow-lg">
      <ul className="divide-y divide-border">
        {companies.map((company, index) => (
          <li key={index}>
            <button
              onClick={() => onSelectCompany(company)}
              className="w-full px-6 py-4 text-left text-card-foreground hover:bg-muted transition-colors duration-150 cursor-pointer text-lg font-medium"
            >
              {company}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default CompanyList;
