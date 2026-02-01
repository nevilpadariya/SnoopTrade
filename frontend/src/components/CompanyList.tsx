import React from 'react';
import { Card } from './ui/card';
import CompanyLogo from './CompanyLogo';

interface CompanyListProps {
  companies: string[];
  companyNames?: Record<string, string>;
  onSelectCompany: (company: string) => void;
}

const CompanyList: React.FC<CompanyListProps> = ({ companies, companyNames = {}, onSelectCompany }) => {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-card border-border shadow-lg">
      <ul className="divide-y divide-border">
        {companies.map((ticker) => {
          const displayName = companyNames[ticker] ? `${ticker} (${companyNames[ticker]})` : ticker;
          return (
            <li key={ticker}>
              <button
                onClick={() => onSelectCompany(ticker)}
                className="w-full px-6 py-4 flex items-center gap-3 text-left text-card-foreground hover:bg-muted transition-colors duration-150 cursor-pointer text-lg font-medium"
              >
                <CompanyLogo ticker={ticker} size={28} />
                {displayName}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default CompanyList;
