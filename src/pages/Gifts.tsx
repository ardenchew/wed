import { HomeHeader } from '../components/HomeHeader';
import { GIFTS_PATH, REGISTRY_URL } from '../config/nav';
import { resolveAsset } from '../utils/asset';

export default function Gifts() {
  return (
    <main className="home-page home-page--schedule gifts">
      <HomeHeader activePath={GIFTS_PATH} />
      <section className="gifts__content" aria-labelledby="gifts-title">
        <h1 id="gifts-title" className="schedule__title">
          Gifts
        </h1>
        <img className="gifts__vine" src={resolveAsset('vine.svg')} alt="" aria-hidden="true" />
        <p className="gifts__lead">Your being there is the greatest gift.</p>
        <p className="gifts__body">
          Gifts are welcome, but never required. For those who have asked, our registry is below.
        </p>
        <a
          className="gifts__link"
          href={REGISTRY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          View our registry
          <svg
            className="gifts__link-icon"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M5 11 11 5" />
            <path d="M6 5h5v5" />
          </svg>
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </section>
    </main>
  );
}
