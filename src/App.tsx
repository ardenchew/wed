import { useCallback, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FreshLoadSplash } from './components/FreshLoadSplash';
import { UserProvider } from './context/UserProvider';
import { useUser } from './hooks/useUser';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
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

function AppRoutes() {
  const [navigationSplashActive, setNavigationSplashActive] = useState(false);
  /** `null` until the first route settles, so the initial render never plays the splash twice. */
  const previousPathnameRef = useRef<string | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    // Compare pathnames rather than the location object: re-navigating to the route you are
    // already on pushes a new history entry (and a new location key) without changing the page.
    if (previousPathname === null || previousPathname === pathname) return;

    // Sign-in already runs its own exit transition into Home; a splash there would double up.
    if (previousPathname === '/' && pathname === '/home') return;

    setNavigationSplashActive(true);
  }, [pathname]);

  const handleNavigationSplashComplete = useCallback(() => {
    setNavigationSplashActive(false);
  }, []);

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
      <HashRouter>
        {!splashDone && <FreshLoadSplash onComplete={handleSplashComplete} />}
        <AppRoutes />
      </HashRouter>
    </UserProvider>
  );
}

export default App;
