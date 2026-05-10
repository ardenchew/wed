import { useCallback, useEffect, useLayoutEffect, useRef, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const LANDING_EXIT_TO_HOME_MS = 620;
/** Keep in sync with `.landing-center-content` `top` transition in index.css */
const LANDING_CENTER_TRANSITION_MS = 720;
import { useUser } from '../hooks/useUser';
import { GUESTS } from '../config/guests';
import { getAllDisplayNames, getGuestSlugForDisplayName } from '../config/users';
import { validatePassword } from '../services/store';
import { searchDisplayName } from '../utils/search';
import { Button } from '../components/Button';
import '../styles/index.css';

export default function Landing() {
  const [isAuthVisible, setIsAuthVisible] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [matchedDisplayName, setMatchedDisplayName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn } = useUser();
  const navigate = useNavigate();
  const deferAutoHomeNavRef = useRef(false);
  const [exitToHome, setExitToHome] = useState(false);
  const [nameStepReady, setNameStepReady] = useState(false);
  const enterTriggerRef = useRef<HTMLButtonElement>(null);
  const morphRef = useRef<HTMLDivElement>(null);
  const nameStepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [enterRulePx, setEnterRulePx] = useState(0);
  const [morphWidthPx, setMorphWidthPx] = useState(0);

  const measureEnterRule = useCallback(() => {
    const el = enterTriggerRef.current;
    if (el) setEnterRulePx(el.offsetWidth);
  }, []);

  useLayoutEffect(() => {
    if (matchedDisplayName) return;
    const node = morphRef.current;
    if (!node) return;
    const syncMorphWidth = () => setMorphWidthPx(node.getBoundingClientRect().width);
    const ro = new ResizeObserver(syncMorphWidth);
    ro.observe(node);
    syncMorphWidth();
    return () => ro.disconnect();
  }, [matchedDisplayName, isAuthVisible, nameStepReady]);

  useLayoutEffect(() => {
    if (isAuthVisible || matchedDisplayName) return;
    measureEnterRule();
  }, [isAuthVisible, matchedDisplayName, measureEnterRule]);

  useEffect(() => {
    if (isAuthVisible || matchedDisplayName) return;
    window.addEventListener('resize', measureEnterRule);
    return () => window.removeEventListener('resize', measureEnterRule);
  }, [isAuthVisible, matchedDisplayName, measureEnterRule]);

  useEffect(() => {
    document.body.classList.add('landing-no-scroll');
    document.documentElement.classList.add('landing-no-scroll');

    return () => {
      document.body.classList.remove('landing-no-scroll');
      document.documentElement.classList.remove('landing-no-scroll');
    };
  }, []);

  useEffect(() => {
    if (!user || deferAutoHomeNavRef.current) return;
    navigate('/home-v2', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (nameStepTimerRef.current != null) {
        window.clearTimeout(nameStepTimerRef.current);
        nameStepTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!exitToHome) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? 40 : LANDING_EXIT_TO_HOME_MS;
    const t = window.setTimeout(() => {
      navigate('/home-v2', { replace: true });
    }, ms);
    return () => window.clearTimeout(t);
  }, [exitToHome, navigate]);

  const handleNameSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    try {
      const displayNames = getAllDisplayNames();
      const matches = searchDisplayName(name.trim(), displayNames);

      if (matches.length === 0) {
        setError('Name not found. Please check your spelling and try again.');
      } else {
        // TODO: show a selection UI when matches.length > 1
        setMatchedDisplayName(matches[0]);
        setPassword('');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!password.trim()) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    if (!matchedDisplayName) {
      setError('Please enter your name first');
      setLoading(false);
      return;
    }

    try {
      const guestSlug = getGuestSlugForDisplayName(matchedDisplayName);
      if (!guestSlug) {
        setError('Invalid user configuration');
        setLoading(false);
        return;
      }

      const isValid = await validatePassword(guestSlug, password.trim());
      
      if (isValid) {
        const guest = GUESTS[guestSlug];
        if (guest) {
          deferAutoHomeNavRef.current = true;
          signIn(guest);
          setExitToHome(true);
        } else {
          setError('Failed to load guest data. Please try again.');
        }
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Password validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setMatchedDisplayName(null);
    setPassword('');
    setError('');
    setName('');
  };

  const handleEnterClick = () => {
    if (isAuthVisible) return;
    setIsAuthVisible(true);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setNameStepReady(true);
      return;
    }
    nameStepTimerRef.current = window.setTimeout(() => {
      setNameStepReady(true);
      nameStepTimerRef.current = null;
    }, LANDING_CENTER_TRANSITION_MS);
  };

  return (
    <div
      className={`landing-hero${isAuthVisible ? ' landing-hero--auth' : ''}${
        exitToHome ? ' landing-hero--exit-to-home' : ''
      }`}
    >
      <div className="landing-cover-image" aria-hidden="true" />
      <div className="landing-cover-gradient" aria-hidden="true" />

      <div className="landing-center-content">
        <div className="landing-transition-shell landing-transition-shell--compact">
          <section className="landing-panel-auth-inner" aria-label="Sign in">
            {!matchedDisplayName ? (
              <form onSubmit={handleNameSubmit} className="sign-in-form">
                <div className="landing-entry-morph" ref={morphRef}>
                  <div
                    className={`landing-entry-morph__stack${nameStepReady ? ' landing-entry-morph__stack--expanded' : ''}`}
                  >
                    <div
                      className={`landing-entry-morph__text-slot${nameStepReady ? ' landing-entry-morph__text-slot--expanded' : ''}`}
                    >
                      {!nameStepReady ? (
                        <button
                          ref={enterTriggerRef}
                          type="button"
                          className="landing-entry-morph__trigger"
                          onClick={handleEnterClick}
                          aria-label="Enter wedding site"
                        >
                          ENTER
                        </button>
                      ) : (
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter guest name"
                          className="landing-entry-morph__input"
                          disabled={loading || exitToHome}
                          autoFocus
                        />
                      )}
                    </div>
                    <div
                      className="landing-entry-morph__rule"
                      style={{
                        transform: nameStepReady
                          ? 'scaleX(1)'
                          : `scaleX(${
                              morphWidthPx > 0 && enterRulePx > 0
                                ? Math.min(1, enterRulePx / morphWidthPx)
                                : 0.12
                            })`,
                      }}
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <Button
                  type="submit"
                  variant="text"
                  disabled={!nameStepReady || loading || exitToHome || !name.trim()}
                  className={!nameStepReady ? 'landing-search-submit--concealed' : undefined}
                  aria-hidden={!nameStepReady}
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            ) : (
              <>
                <p className="landing-auth-title">{matchedDisplayName}</p>

                <form onSubmit={handlePasswordSubmit} className="sign-in-form">
                  <div className="form-group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="name-input name-input--plain"
                      disabled={loading || exitToHome}
                      autoFocus
                    />
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <div className="form-actions form-actions--inline">
                    <Button
                      type="button"
                      variant="text"
                      onClick={handleBack}
                      disabled={loading || exitToHome}
                    >
                      Back
                    </Button>
                    <Button type="submit" variant="text" disabled={loading || exitToHome}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
