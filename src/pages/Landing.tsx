/**
 * Landing Page
 * 
 * Name input and password authentication page
 */

import { useEffect, useState, FormEvent } from 'react';
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
    <div className="landing-hero">
      <div className="landing-cover-image" aria-hidden="true" />
      <div className="landing-cover-gradient" aria-hidden="true" />

      <div className="landing-center-content">
        <div className="landing-transition-shell">
          <section
            className={`landing-panel landing-panel-hero${isAuthVisible ? ' landing-panel-hidden' : ' landing-panel-visible'}`}
            aria-hidden={isAuthVisible}
          >
            <h1 className="landing-names">Emily &amp; Arden</h1>
            <p className="landing-year">2027</p>
            <Button
              variant="outlineSerif"
              onClick={() => setIsAuthVisible(true)}
              aria-label="Enter wedding site"
            >
              Enter
            </Button>
          </section>

          <section
            className={`landing-panel landing-panel-auth${isAuthVisible ? ' landing-panel-visible' : ' landing-panel-hidden'}`}
            aria-hidden={!isAuthVisible}
          >
            {!matchedDisplayName ? (
              <>
                <p className="landing-auth-title">Find your invitation</p>
                <p className="landing-auth-subtitle">Type your full name to continue</p>
                <form onSubmit={handleNameSubmit} className="sign-in-form">
                  <div className="form-group">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Search guest name"
                      className="name-input name-input--plain"
                      disabled={loading}
                      autoFocus={isAuthVisible}
                    />
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <Button type="submit" variant="text" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="landing-auth-title">Welcome, {matchedDisplayName}</p>
                <p className="landing-auth-subtitle">Enter your password</p>

                <form onSubmit={handlePasswordSubmit} className="sign-in-form">
                  <div className="form-group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="name-input name-input--plain"
                      disabled={loading}
                      autoFocus={isAuthVisible}
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
