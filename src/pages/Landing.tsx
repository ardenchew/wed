/**
 * Landing Page
 * 
 * Name input and password authentication page
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
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
  const { signIn } = useUser();
  const navigate = useNavigate();
  const enterTriggerRef = useRef<HTMLButtonElement>(null);
  const morphRef = useRef<HTMLDivElement>(null);
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
  }, [matchedDisplayName, isAuthVisible]);

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
      } else if (matches.length === 1) {
        // Single match found, proceed to password
        setMatchedDisplayName(matches[0]);
        setPassword('');
      } else {
        // Multiple matches found - for now, use the first match
        // In the future, you could show a selection UI
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
          signIn(guest);
          navigate('/home');
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

  return (
    <div className={`landing-hero${isAuthVisible ? ' landing-hero--auth' : ''}`}>
      <div className="landing-cover-image" aria-hidden="true" />
      <div className="landing-cover-gradient" aria-hidden="true" />

      <div className="landing-center-content">
        <div className="landing-transition-shell landing-transition-shell--compact">
          <section className="landing-panel-auth-inner" aria-label="Sign in">
            {!matchedDisplayName ? (
              <form onSubmit={handleNameSubmit} className="sign-in-form">
                <div className="landing-entry-morph" ref={morphRef}>
                  <div
                    className={`landing-entry-morph__stack${isAuthVisible ? ' landing-entry-morph__stack--expanded' : ''}`}
                  >
                    <div
                      className={`landing-entry-morph__text-slot${isAuthVisible ? ' landing-entry-morph__text-slot--expanded' : ''}`}
                    >
                      {!isAuthVisible ? (
                        <button
                          ref={enterTriggerRef}
                          type="button"
                          className="landing-entry-morph__trigger"
                          onClick={() => setIsAuthVisible(true)}
                          aria-label="Enter wedding site"
                        >
                          Enter
                        </button>
                      ) : (
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter guest name"
                          className="landing-entry-morph__input"
                          disabled={loading}
                          autoFocus
                        />
                      )}
                    </div>
                    <div
                      className="landing-entry-morph__rule"
                      style={{
                        transform: isAuthVisible
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
                  disabled={!isAuthVisible || loading || !name.trim()}
                  className={!isAuthVisible ? 'landing-search-submit--concealed' : undefined}
                  aria-hidden={!isAuthVisible}
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            ) : (
              <>
                <p className="landing-auth-title">Welcome, {matchedDisplayName}</p>

                <form onSubmit={handlePasswordSubmit} className="sign-in-form">
                  <div className="form-group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="name-input name-input--plain"
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <div className="form-actions form-actions--inline">
                    <Button
                      type="button"
                      variant="text"
                      onClick={handleBack}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button type="submit" variant="text" disabled={loading}>
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
