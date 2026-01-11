/**
 * Home Page
 * 
 * Main page displayed after user signs in
 */

import { useUser } from '../context/UserContext';
import '../styles/index.css';

export default function Home() {
  const { user, signOut } = useUser();

  const handleButtonClick = (page: string) => {
    // Navigate to specific pages (to be implemented)
    console.log(`Navigate to ${page}`);
    // For now, just show alert
    alert(`${page} page coming soon!`);
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <header className="home-header">
          <h1>Welcome, {user?.fullName}!</h1>
          <button onClick={signOut} className="sign-out-button">
            Sign Out
          </button>
        </header>

        <div className="action-buttons">
          <button
            onClick={() => handleButtonClick('RSVP')}
            className="action-button"
          >
            RSVP
          </button>
          
          <button
            onClick={() => handleButtonClick('Schedule')}
            className="action-button"
          >
            Schedule
          </button>
          
          <button
            onClick={() => handleButtonClick('Gift')}
            className="action-button"
          >
            Gift
          </button>
        </div>
      </div>
    </div>
  );
}
