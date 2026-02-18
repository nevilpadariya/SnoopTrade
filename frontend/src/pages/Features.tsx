import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BarChart2, Bell, Database, LineChart, Lock, Search, Shield, TrendingUp, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';

const featuresData = [
  {
    icon: <LineChart size={30} aria-hidden="true" />,
    title: 'Realtime Tracking',
    description: 'Monitor insider trading activity as filings arrive with fast synchronized updates.',
  },
  {
    icon: <Bell size={30} aria-hidden="true" />,
    title: 'Smart Alerts',
    description: 'Get focused signal updates for movements that matter to your watchlist.',
  },
  {
    icon: <Shield size={30} aria-hidden="true" />,
    title: 'Secure Platform',
    description: 'Protected account and API flows with robust access controls and safe defaults.',
  },
  {
    icon: <TrendingUp size={30} aria-hidden="true" />,
    title: 'Market Analysis',
    description: 'Inspect trends, transaction behavior, and directional signal summaries in one place.',
  },
  {
    icon: <BarChart2 size={30} aria-hidden="true" />,
    title: 'Advanced Analytics',
    description: 'Use forecast confidence bands and activity distributions to evaluate momentum.',
  },
  {
    icon: <Search size={30} aria-hidden="true" />,
    title: 'Deep Search',
    description: 'Find tickers and company context quickly across insider transactions and filings.',
  },
  {
    icon: <Zap size={30} aria-hidden="true" />,
    title: 'Fast Experience',
    description: 'Optimized charts, caching, and compact screens built for daily decision workflows.',
  },
  {
    icon: <Database size={30} aria-hidden="true" />,
    title: 'Historical Coverage',
    description: 'Access extensive filing history and transaction patterns for better context.',
  },
  {
    icon: <Lock size={30} aria-hidden="true" />,
    title: 'Privacy First',
    description: 'Your account data stays yours. SnoopTrade does not sell user strategy data.',
  },
];

const Features = () => {
  return (
    <>
      <Helmet>
        <title>Features - SnoopTrade</title>
        <meta
          name="description"
          content="Explore SnoopTrade features: realtime tracking, smart alerts, advanced analytics, and insider trading insights."
        />
      </Helmet>

      <div className="signal-surface min-h-screen text-[#E6ECE8]">
        <header className="sticky top-0 z-40 border-b border-[#2D4035] bg-[#101813]/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="text-xl font-bold tracking-tight text-[#E6ECE8] sm:text-2xl">
              SnoopTrade
            </Link>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-xl border-[#35503D] bg-[#18241D] px-4 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
              >
                <Link to="/about">About</Link>
              </Button>
              <Button asChild className="signal-cta h-10 rounded-xl px-4 text-sm font-bold">
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="signal-grid-overlay">
          <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
            <section className="signal-glass rounded-3xl p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EA197]">Capabilities</p>
              <h1 className="mt-2 text-4xl font-extrabold text-[#EAF5EC] sm:text-5xl">Built for Signal-First Analysis</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#B9C9BD] sm:text-lg">
                SnoopTrade combines insider activity tracking, chart intelligence, and forecast tooling in one focused workflow.
              </p>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {featuresData.map((feature) => (
                <article key={feature.title} className="signal-glass rounded-2xl p-6">
                  <div className="inline-flex rounded-xl border border-[#34503E] bg-[#122019] p-3 text-[#A7E89A]">
                    {feature.icon}
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-[#EAF5EC]">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#B3C4B8]">{feature.description}</p>
                </article>
              ))}
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default Features;
