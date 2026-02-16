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

  const handleTabPress = (tab: typeof TABS[number]) => {
    if (tab.hash) {
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard');
        // After navigation, scroll to the section
        setTimeout(() => {
          document.querySelector(tab.hash!)?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        document.querySelector(tab.hash)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(tab.path);
    }
  };

  const isActive = (tab: typeof TABS[number]) => {
    if (tab.path === '/account') return location.pathname === '/account';
    if (tab.hash) return false; // hash tabs don't have an "active" state from URL
    return location.pathname === '/dashboard';
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        backgroundColor: '#1A231C',
        borderTop: '1px solid #314036',
        height: 70,
        paddingTop: 8,
        paddingBottom: 10,
      }}
    >
      <div className="flex items-center justify-around h-full">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.label}
              onClick={() => handleTabPress(tab)}
              className="flex flex-col items-center justify-center gap-1 flex-1"
              style={{ color: active ? '#B7E389' : '#A7B7AC' }}
            >
              <Icon size={22} />
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 400 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
