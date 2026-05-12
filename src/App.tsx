import { useCallback, useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FreshLoadSplash } from './components/FreshLoadSplash';
import { UserProvider } from './context/UserProvider';
import { useUser } from './hooks/useUser';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Schedule from './pages/Schedule';
import { RsvpPlaceholder, GiftPlaceholder } from './pages/PlaceholderPage';
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
  const previousLocationRef = useRef<string>('');
  const location = useLocation();

  useEffect(() => {
    const locationString = JSON.stringify(location);

    if (previousLocationRef.current === '') {
      previousLocationRef.current = locationString;
      return;
    }

    if (locationString !== previousLocationRef.current) {
      const prevLocation = JSON.parse(previousLocationRef.current);
      const isSignInToHome = prevLocation.pathname === '/' && location.pathname === '/home';

      previousLocationRef.current = locationString;

      if (!isSignInToHome) {
        setNavigationSplashActive(true);
      }
    }
  }, [location]);

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
        <Route
          path="/rsvp"
          element={
            <ProtectedRoute>
              <RsvpPlaceholder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gift"
          element={
            <ProtectedRoute>
              <GiftPlaceholder />
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
