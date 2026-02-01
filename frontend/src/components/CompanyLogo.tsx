import { useState } from 'react';
import { getCompanyLogoUrl } from '../utils/companyLogo';

interface CompanyLogoProps {
  ticker: string;
  size?: number;
  className?: string;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({ ticker, size = 32, className = '' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const logoUrl = getCompanyLogoUrl(ticker);
  const showFallback = !logoUrl || imgFailed;
  const initial = ticker ? ticker[0].toUpperCase() : '?';

  const inlineSize = { width: size, height: size };

  if (showFallback) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold shrink-0 ${className}`}
        style={inlineSize}
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt=""
      className={`rounded-full object-contain shrink-0 ${className}`}
      style={inlineSize}
      onError={() => setImgFailed(true)}
    />
  );
};

export default CompanyLogo;
