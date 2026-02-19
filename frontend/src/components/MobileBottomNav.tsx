import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ArrowLeftRight, TrendingUp, User } from 'lucide-react';

const TABS: { label: string; icon: typeof Home; path: string; hash?: string }[] = [
  { label: 'Home', icon: Home, path: '/dashboard' },
  { label: 'Trades', icon: ArrowLeftRight, path: '/dashboard', hash: '#transactions' },
  { label: 'Forecast', icon: TrendingUp, path: '/dashboard', hash: '#forecast' },
  { label: 'Account', icon: User, path: '/account' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeHash, setActiveHash] = useState<string>('');

  useEffect(() => {
    if (location.pathname !== '/dashboard') {
      setActiveHash('');
      return;
    }
    if (location.hash) {
      setActiveHash(location.hash);
    }
  }, [location.hash, location.pathname]);

  const handleTabPress = (tab: typeof TABS[number]) => {
    if (tab.hash) {
      setActiveHash(tab.hash);
      if (location.pathname !== '/dashboard') {
        navigate({ pathname: '/dashboard', hash: tab.hash });
        // After navigation, scroll to the section
        setTimeout(() => {
          document.querySelector(tab.hash!)?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        navigate({ pathname: '/dashboard', hash: tab.hash });
        document.querySelector(tab.hash)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setActiveHash('');
      navigate(tab.path);
    }
  };

  const isActive = (tab: typeof TABS[number]) => {
    if (tab.path === '/account') return location.pathname === '/account';
    if (tab.hash) return location.pathname === '/dashboard' && activeHash === tab.hash;
    return location.pathname === '/dashboard' && activeHash === '';
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        backgroundColor: 'hsl(var(--card))',
        borderTop: '1px solid hsl(var(--border))',
        height: 74,
        paddingTop: 8,
        paddingBottom: 12,
      }}
    >
      <div className="mx-auto flex h-full max-w-2xl items-center justify-around">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              onClick={() => handleTabPress(tab)}
              className="flex flex-1 flex-col items-center justify-center gap-1"
              style={{ color: active ? 'hsl(var(--primary-strong))' : 'hsl(var(--muted-foreground))' }}
            >
              <Icon size={23} />
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 500 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
