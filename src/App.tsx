import { useCallback, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router';
import { FreshLoadSplash } from './components/FreshLoadSplash';
import { RsvpProvider } from './context/RsvpProvider';
import { UserProvider } from './context/UserProvider';
import { wantsRsvp } from './hooks/useOpenRsvp';
import { useRsvp } from './hooks/useRsvp';
import { useUser } from './hooks/useUser';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import Admin from './pages/Admin';
import { ADMIN_PATH } from './config/nav';
import SplashPreview from './pages/SplashPreview';
import './styles/index.css';

function isSplashPreviewHash() {
  if (typeof window === 'undefined') return false;
  const { hash } = window.location;
  return hash === '#/splash' || hash.startsWith('#/splash?') || hash.startsWith('#/splash/');
}

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user } = useUser();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

/** Signed-in admins only; everyone else is sent to Home. The API enforces this too. */
function AdminRoute({ children }: { children: React.ReactElement }) {
  const { user } = useUser();
  if (!user) return <Navigate to="/" replace />;
  if (!user.isAdmin) return <Navigate to="/home" replace />;
  return children;
}

function AppRoutes() {
  const [navigationSplashActive, setNavigationSplashActive] = useState(false);
  /** `null` until the first route settles, so the initial render never plays the splash twice. */
  const previousPathnameRef = useRef<string | null>(null);
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const { openRsvp } = useRsvp();

  /**
   * An RSVP click elsewhere navigates here with `{ openRsvp: true }` (see useOpenRsvp). The modal
   * is a top-layer <dialog>, so it would sit above the navigation splash — open it only once the
   * splash has finished, then drop the state so Back/refresh don't reopen it.
   */
  const pendingRsvpRef = useRef(false);
  const openPendingRsvp = useCallback(() => {
    if (!pendingRsvpRef.current) return;
    pendingRsvpRef.current = false;
    openRsvp();
    navigate(pathname, { replace: true, state: null });
  }, [openRsvp, navigate, pathname]);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    if (wantsRsvp(location.state)) pendingRsvpRef.current = true;

    // Compare pathnames rather than the location object: re-navigating to the route you are
    // already on pushes a new history entry (and a new location key) without changing the page.
    // Sign-in already runs its own exit transition into Home; a splash there would double up.
    const playSplash =
      previousPathname !== null &&
      previousPathname !== pathname &&
      !(previousPathname === '/' && pathname === '/home');

    if (playSplash) {
      // Arriving to RSVP: start Schedule at the top (the browser keeps the previous page's scroll).
      if (pendingRsvpRef.current) window.scrollTo(0, 0);
      setNavigationSplashActive(true);
    } else {
      openPendingRsvp();
    }
  }, [pathname, location.state, openPendingRsvp]);

  const handleNavigationSplashComplete = useCallback(() => {
    setNavigationSplashActive(false);
    openPendingRsvp();
  }, [openPendingRsvp]);

  return (
    <>
      {navigationSplashActive && (
        <FreshLoadSplash onComplete={handleNavigationSplashComplete} />
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <Schedule />
            </ProtectedRoute>
          }
        />
        <Route
          path={ADMIN_PATH}
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route path="/splash" element={<SplashPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(isSplashPreviewHash);
  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  return (
    <UserProvider>
      <RsvpProvider>
        <HashRouter>
          {!splashDone && <FreshLoadSplash onComplete={handleSplashComplete} />}
          <AppRoutes />
        </HashRouter>
      </RsvpProvider>
    </UserProvider>
  );
}

export default App;
