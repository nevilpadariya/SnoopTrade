import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const NotFound = () => {
  return (
    <div className="signal-surface min-h-screen text-[#E6ECE8]">
      <Helmet>
        <title>Page Not Found - SnoopTrade</title>
      </Helmet>

      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8EA197]">404</p>
        <h1 className="mt-3 text-5xl font-extrabold text-[#EAF5EC] sm:text-6xl">Page not found</h1>
        <p className="mt-4 text-base text-[#B6C8BB] sm:text-lg">
          The page you requested does not exist or may have moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild className="signal-cta h-11 rounded-xl px-6 text-sm font-bold">
            <Link to="/">Go Home</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl border-[#35503D] bg-[#18241D] px-6 text-sm font-semibold text-[#D4E2D6] hover:bg-[#203027]"
          >
            <Link to="/dashboard">Open Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
