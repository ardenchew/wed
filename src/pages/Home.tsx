import { Navigate, useLocation } from 'react-router-dom';
import { HomeHeader } from '../components/HomeHeader';
import { NAV_ITEMS } from '../config/nav';
import Schedule from './Schedule';
import '../styles/index.css';

const HOME_SUB_PATHS: ReadonlySet<string> = new Set([
  '/home/schedule',
  '/home/rsvp',
  '/home/gift',
]);

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export default function Home() {
  const location = useLocation();
  const normalizedPath = normalizePath(location.pathname);

  if (!HOME_SUB_PATHS.has(normalizedPath)) {
    return <Navigate to="/home-v2" replace />;
  }

  const activeLabel = NAV_ITEMS.find((item) => item.path === normalizedPath)?.label ?? '';

  return (
    <main className={`home-page${normalizedPath === '/home/schedule' ? ' home-page--schedule' : ''}`}>
      <HomeHeader activePath={normalizedPath} />

      {normalizedPath === '/home/schedule' ? (
        <Schedule />
      ) : (
        <section className="home-page__subpage" aria-live="polite">
          <p className="home-placeholder">Placeholder: {activeLabel}</p>
        </section>
      )}
    </main>
  );
}
