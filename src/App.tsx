/**
 * Main App Component
 * 
 * Sets up routing and provides user context
 */

import { useCallback, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FreshLoadSplash } from './components/FreshLoadSplash';
import { UserProvider, useUser } from './context/UserContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import HomeV2 from './pages/HomeV2';
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
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/home-v2"
        element={
          <ProtectedRoute>
            <HomeV2 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home/*"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="/splash" element={<SplashPreview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
