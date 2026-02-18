import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const Landing = () => {
  return (
    <>
      <Helmet>
        <title>SnoopTrade - Signal Glass 2026</title>
        <meta
          name="description"
          content="Track insider behavior before market reactions with realtime filings, confidence signals, and clean portfolio-ready workflows."
        />
        <link rel="canonical" href="https://snooptrade.com" />
      </Helmet>

      <div className="signal-surface signal-page text-[#E6ECE8]">
        <header className="sticky top-0 z-40 border-b border-[#2D4035] bg-[#101813]/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="text-2xl font-bold tracking-tight text-[#E6ECE8]">
              SnoopTrade
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <Link to="/features" className="text-sm font-semibold text-[#A7B7AC] transition hover:text-[#E6ECE8]">
                Features
              </Link>
              <Link to="/about" className="text-sm font-semibold text-[#A7B7AC] transition hover:text-[#E6ECE8]">
                About
              </Link>
              <Link to="/login" className="text-sm font-semibold text-[#A7B7AC] transition hover:text-[#E6ECE8]">
                Login
              </Link>
            </nav>
            <Button asChild className="signal-cta h-10 rounded-xl px-4 text-sm font-bold">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </header>

        <main className="signal-grid-overlay">
          <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="lg:col-span-6">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#8EA197]">
                Insider Intelligence Platform
              </p>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                Track Insider Moves
                <span className="block text-[#A7E89A]">Before Market Reactions</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#C7D0CA] sm:text-xl">
                Realtime filings, behavior signals, and confidence-weighted forecasts for focused investors.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button asChild className="signal-cta h-12 rounded-2xl px-8 text-base font-bold">
                  <Link to="/signup">Start Free</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-2xl border-[#35503D] bg-[#18241D] px-8 text-base font-semibold text-[#D6E2D8] hover:bg-[#1E2C24]"
                >
                  <Link to="/login">View Dashboard</Link>
                </Button>
              </div>
            </div>

            <div className="signal-glass rounded-3xl p-5 sm:p-7 lg:col-span-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EA197]">AAPL Insider Signal</p>
              <p className="mt-3 font-mono text-2xl font-bold text-[#CFF1C7] sm:text-3xl">+12.4% predictive confidence</p>
              <div className="mt-6 rounded-2xl bg-[#142119] p-4">
                <div className="relative h-52 overflow-hidden rounded-xl bg-[#111A15]">
                  <svg className="h-full w-full" viewBox="0 0 640 220" fill="none">
                    <polyline
                      points="10,190 70,178 130,166 190,140 250,156 310,112 370,128 430,84 490,70 550,38 630,46"
                      stroke="#A7E89A"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="10,206 70,196 130,184 190,176 250,166 310,160 370,152 430,138 490,128 550,116 630,102"
                      stroke="#3B5A45"
                      strokeWidth="2"
                      strokeDasharray="8 7"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#34503E] bg-[#122019] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Daily Filings</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#D7E8D8]">14,832</p>
                </div>
                <div className="rounded-xl border border-[#34503E] bg-[#122019] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8EA197]">Avg Latency</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#D7E8D8]">3.2m</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-24 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              {
                title: 'SEC Sync',
                copy: 'Fresh Form 4 ingestion with resilient retries and scheduling.',
              },
              {
                title: 'Signal Quality',
                copy: 'Confidence-weighted trend scoring with explainable context.',
              },
              {
                title: 'Actionable Views',
                copy: 'Data-rich dashboard designed for daily review on any screen.',
              },
            ].map((item) => (
              <article key={item.title} className="signal-glass rounded-2xl p-6">
                <h2 className="text-xl font-bold text-[#E6ECE8]">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#B8C8BC]">{item.copy}</p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </>
  );
};

export default Landing;
