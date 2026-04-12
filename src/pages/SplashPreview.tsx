import { useEffect } from 'react';
import { FreshLoadSplash } from '../components/FreshLoadSplash';

/**
 * Static splash for design tweaks. Open /#/splash (e.g. …/wed/#/splash on GitHub Pages).
 */
export default function SplashPreview() {
  useEffect(() => {
    document.documentElement.classList.remove('pre-splash');
  }, []);

  return <FreshLoadSplash staticPreview onComplete={() => {}} />;
}
