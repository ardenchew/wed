/**
 * Landing Page
 * 
 * Name input and password authentication page
 */

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { validatePassword } from '../services/redis';
import { getAllDisplayNames, getRedisKeyForDisplayName } from '../config/users';
import { searchDisplayName } from '../utils/search';
import { normalizeFullName } from '../../schema/v1/user';
import '../styles/index.css';

export default function Landing() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [matchedDisplayName, setMatchedDisplayName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useUser();
  const navigate = useNavigate();

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
      const redisKey = getRedisKeyForDisplayName(matchedDisplayName);
      if (!redisKey) {
        setError('Invalid user configuration');
        setLoading(false);
        return;
      }

      const isValid = await validatePassword(redisKey, password.trim());
      
      if (isValid) {
        // Sign in the user
        const normalizedName = normalizeFullName(matchedDisplayName);
        signIn({
          normalizedName,
          fullName: matchedDisplayName,
        });
        navigate('/home');
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

  // Show password input if name matched
  if (matchedDisplayName) {
    return (
      <div className="landing-container">
        <div className="landing-content">
          <h1>Welcome</h1>
          <p className="subtitle">Please enter your password</p>
          <p className="user-name">{matchedDisplayName}</p>
          
          <form onSubmit={handlePasswordSubmit} className="sign-in-form">
            <div className="form-group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="name-input"
                disabled={loading}
                autoFocus
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-actions">
              <button
                type="button"
                onClick={handleBack}
                className="back-button"
                disabled={loading}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show name input
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1>Welcome</h1>
        <p className="subtitle">Please enter your name to continue</p>
        
        <form onSubmit={handleNameSubmit} className="sign-in-form">
          <div className="form-group">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="name-input"
              disabled={loading}
              autoFocus
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
