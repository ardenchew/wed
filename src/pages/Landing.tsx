import { useCallback, useEffect, useLayoutEffect, useRef, useState, FormEvent, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { useUser } from '../hooks/useUser';
import { ApiError } from '../api/client';
import { fetchMe, lookupGuests } from '../api/guests';
import type { GuestName } from '../guests/shared';
import { Button } from '../components/Button';
import { HeroImage } from '../components/HeroImage';

const LANDING_EXIT_TO_HOME_MS = 620;

export default function Landing() {
  const [isAuthVisible, setIsAuthVisible] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [matchedGuest, setMatchedGuest] = useState<GuestName | null>(null);
  const matchedDisplayName = matchedGuest?.name ?? null;
  /** Set when the typed name matched several guests: the "Which one are you?" step. */
  const [candidates, setCandidates] = useState<GuestName[] | null>(null);
  /** True while the name form (ENTER / name input) is the step on screen. */
  const onNameStep = !matchedGuest && !candidates;
  const [error, setError] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const pickerRef = useRef<HTMLUListElement>(null);
  const [loading, setLoading] = useState(false);
  const { user, signIn } = useUser();
  const navigate = useNavigate();
  const deferAutoHomeNavRef = useRef(false);
  const [exitToHome, setExitToHome] = useState(false);
  const enterTriggerRef = useRef<HTMLButtonElement>(null);
  const morphRef = useRef<HTMLDivElement>(null);
  const [enterRulePx, setEnterRulePx] = useState(0);
  const [morphWidthPx, setMorphWidthPx] = useState(0);

  const measureEnterRule = useCallback(() => {
    const el = enterTriggerRef.current;
    if (el) setEnterRulePx(el.offsetWidth);
  }, []);

  useLayoutEffect(() => {
    if (!onNameStep) return;
    const node = morphRef.current;
    if (!node) return;
    const syncMorphWidth = () => setMorphWidthPx(node.getBoundingClientRect().width);
    const ro = new ResizeObserver(syncMorphWidth);
    ro.observe(node);
    syncMorphWidth();
    return () => ro.disconnect();
  }, [onNameStep, isAuthVisible]);

  useLayoutEffect(() => {
    if (isAuthVisible || !onNameStep) return;
    measureEnterRule();
  }, [isAuthVisible, onNameStep, measureEnterRule]);

  useEffect(() => {
    if (isAuthVisible || !onNameStep) return;
    window.addEventListener('resize', measureEnterRule);
    return () => window.removeEventListener('resize', measureEnterRule);
  }, [isAuthVisible, onNameStep, measureEnterRule]);

  // Move focus to the first name when the picker opens, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (candidates && !matchedGuest) pickerRef.current?.querySelector('button')?.focus();
  }, [candidates, matchedGuest]);

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
    navigate('/home', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!exitToHome) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? 40 : LANDING_EXIT_TO_HOME_MS;
    const t = window.setTimeout(() => {
      navigate('/home', { replace: true });
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
      const matches = await lookupGuests(name.trim());

      if (matches.length === 0) {
        setError(
          'We couldn’t find that name. Try your full first name, or your first and last name.',
        );
      } else if (matches.length === 1) {
        chooseGuest(matches[0]);
      } else {
        setCandidates(matches);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'An error occurred. Please try again.');
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

    if (!matchedGuest) {
      setError('Please enter your name first');
      setLoading(false);
      return;
    }

    setWrongPassword(false);
    try {
      const guest = await fetchMe({ slug: matchedGuest.slug, password: password.trim() });
      deferAutoHomeNavRef.current = true;
      signIn(guest, password.trim());
      setExitToHome(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setWrongPassword(true);
        setPassword('');
      } else {
        setError(err instanceof ApiError ? err.message : 'An error occurred. Please try again.');
        console.error('Sign-in error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const chooseGuest = (guest: GuestName) => {
    setMatchedGuest(guest);
    setPassword('');
    setError('');
    setWrongPassword(false);
  };

  /** Back from the password step: to the list if there was one, else to the name (kept, to edit). */
  const handleBack = () => {
    setMatchedGuest(null);
    setPassword('');
    setError('');
    setWrongPassword(false);
  };

  /** Back to typing a name, from the list or from a wrong password. */
  const handleSearchAgain = () => {
    handleBack();
    setCandidates(null);
  };

  /** Up/down arrows (and Home/End) move between the names in the list. */
  const handlePickerKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const buttons = Array.from(e.currentTarget.querySelectorAll('button'));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === 'ArrowDown' ? current + 1
      : e.key === 'ArrowUp' ? current - 1
      : e.key === 'Home' ? 0
      : e.key === 'End' ? buttons.length - 1
      : null;
    if (next === null) return;
    e.preventDefault();
    buttons[(next + buttons.length) % buttons.length]?.focus();
  };

  /** ENTER turns into the name field right where it is; its underline widens to full width. */
  const handleEnterClick = () => {
    if (isAuthVisible) return;
    setIsAuthVisible(true);
  };

  return (
    <div
      className={`landing-hero${isAuthVisible ? ' landing-hero--auth' : ''}${
        exitToHome ? ' landing-hero--exit-to-home' : ''
      }`}
    >
      <HeroImage className="landing-cover-image" priority />
      <div className="landing-cover-gradient" aria-hidden="true" />

      <div className="landing-center-content">
        <div className="landing-transition-shell landing-transition-shell--compact">
          <section className="landing-panel-auth-inner" aria-label="Sign in">
            {onNameStep ? (
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

                {error && <div className="error-message" role="alert">{error}</div>}

                <Button
                  type="submit"
                  variant="text"
                  disabled={!isAuthVisible || loading || exitToHome || !name.trim()}
                  className={!isAuthVisible ? 'landing-search-submit--concealed' : undefined}
                  aria-hidden={!isAuthVisible}
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </form>
            ) : !matchedGuest && candidates ? (
              <div className="landing-picker">
                <h2 id="landing-picker-title" className="landing-picker__title">
                  Which one are you?
                </h2>
                <ul
                  ref={pickerRef}
                  className="landing-picker__list"
                  aria-labelledby="landing-picker-title"
                  onKeyDown={handlePickerKeyDown}
                >
                  {candidates.map((guest) => (
                    <li key={guest.slug}>
                      <button
                        type="button"
                        className="landing-picker__option"
                        onClick={() => chooseGuest(guest)}
                      >
                        {guest.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <Button type="button" variant="text" onClick={handleSearchAgain}>
                  None of these
                </Button>
              </div>
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

                  {wrongPassword ? (
                    <div className="error-message" role="alert">
                      That password doesn’t match {matchedDisplayName}. Try again, or{' '}
                      <button type="button" className="error-message__link" onClick={handleSearchAgain}>
                        choose a different name
                      </button>
                      .
                    </div>
                  ) : (
                    error && <div className="error-message" role="alert">{error}</div>
                  )}

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
