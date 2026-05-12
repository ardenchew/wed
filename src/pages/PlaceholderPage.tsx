import { HomeHeader } from '../components/HomeHeader';

type PlaceholderPageProps = {
  label: string;
  activePath: string;
};

function PlaceholderPage({ label, activePath }: PlaceholderPageProps) {
  return (
    <main className="home-page">
      <HomeHeader activePath={activePath} />
      <section className="home-page__subpage" aria-live="polite">
        <p className="home-placeholder">Placeholder: {label}</p>
      </section>
    </main>
  );
}

export function RsvpPlaceholder() {
  return <PlaceholderPage label="RSVP" activePath="/rsvp" />;
}

export function GiftPlaceholder() {
  return <PlaceholderPage label="Gift" activePath="/gift" />;
}

export default PlaceholderPage;
