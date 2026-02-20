import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Building2, Cpu, ShieldCheck, Users2 } from 'lucide-react';
import { Button } from '../components/ui/button';

const sections = [
  {
    icon: <Building2 className="h-6 w-6 text-[#A7E89A]" />,
    title: 'Our Mission',
    body: 'SnoopTrade exists to make insider trading intelligence accessible and understandable for every investor. We focus on clarity, speed, and actionable context.',
  },
  {
    icon: <Cpu className="h-6 w-6 text-[#A7E89A]" />,
    title: 'What We Build',
    body: 'We combine SEC filing ingestion, normalized transaction data, and lightweight forecasting so users can evaluate behavior signals without data wrangling.',
  },
  {
    icon: <ShieldCheck className="h-6 w-6 text-[#A7E89A]" />,
    title: 'Reliability Principles',
    body: 'Security defaults, route-level protection, token rotation, and operational monitoring guide our engineering decisions from day one.',
  },
  {
    icon: <Users2 className="h-6 w-6 text-[#A7E89A]" />,
    title: 'Who It Serves',
    body: 'SnoopTrade is designed for students, retail investors, and builders who want an efficient signal workflow without terminal complexity.',
  },
];

const About = () => {
  return (
    <>
      <Helmet>
        <title>About - SnoopTrade</title>
        <meta
          name="description"
          content="Learn about SnoopTrade's mission, technology approach, and our commitment to transparent insider trading intelligence."
        />
      </Helmet>

      <div className="signal-surface signal-page text-[#E6ECE8]">
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
                <Link to="/features">Features</Link>
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4F675B] dark:text-[#8EA197]">About SnoopTrade</p>
              <h1 className="mt-2 text-4xl font-extrabold text-[#EAF5EC] sm:text-5xl">Engineering Signal Clarity</h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#B9C9BD] sm:text-lg">
                We are building a pragmatic platform that turns SEC insider activity into clear market context for everyday users.
              </p>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              {sections.map((section) => (
                <article key={section.title} className="signal-glass rounded-2xl p-6">
                  <div className="inline-flex rounded-xl border border-[#34503E] bg-[#122019] p-2.5">{section.icon}</div>
                  <h2 className="mt-4 text-2xl font-bold text-[#EAF5EC]">{section.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#B3C4B8] sm:text-base">{section.body}</p>
                </article>
              ))}
            </section>
          </div>
        </main>
      </div>
    </>
  );
};

export default About;
