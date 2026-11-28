-- Guests move from src/config/*.ts into the database so they can be managed from the admin page.
-- Events stay in src/config/events.ts; guest_events references them by slug.

CREATE TABLE guests (
  slug              TEXT PRIMARY KEY,           -- stable id; RSVP rows key on it, never changes
  first             TEXT NOT NULL,
  last              TEXT NOT NULL,
  nickname          TEXT,
  password          TEXT NOT NULL,              -- plain text so admins can read it back to guests
  is_admin          INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
  party_id          TEXT,                       -- guests sharing a party_id can RSVP for each other
  welcome_greeting  TEXT,
  welcome_body      TEXT,
  welcome_signature TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE INDEX guests_party ON guests (party_id);

CREATE TABLE guest_events (
  guest_slug TEXT NOT NULL REFERENCES guests (slug) ON DELETE CASCADE,
  event_slug TEXT NOT NULL,
  PRIMARY KEY (guest_slug, event_slug)
);

-- polaroids[0] is the Home page's weekend polaroid; the rest join the gallery loop.
CREATE TABLE guest_polaroids (
  guest_slug TEXT    NOT NULL REFERENCES guests (slug) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  public_id  TEXT    NOT NULL,                  -- Cloudinary public id, e.g. wed/guests/debbie_kwan/1
  date_text  TEXT    NOT NULL,
  PRIMARY KEY (guest_slug, position)
);

-- Seed: the guests that lived in src/config/guests.ts and authUsers.ts. These passwords were
-- already public in the old JS bundle — change them from the admin page before sharing the site.
INSERT INTO guests
  (slug, first, last, nickname, password, is_admin, party_id,
   welcome_greeting, welcome_body, welcome_signature, created_at, updated_at)
VALUES
  ('arden_chew', 'Arden', 'Chew', 'ardy', 'arden123', 1, 'party_emily_arden',
   'Lorum Ipsum',
   'ksaldjf;aklsdjf klsjdfkl sdjf lksdj fklsdj fkdlsj fklsdj fslkdj flksdj fklsj kfsdjklf jsdlkj fskdkf js',
   '-arden', '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z'),
  ('emily_kwan', 'Emily', 'Kwan', 'bapo', 'emily123', 1, 'party_emily_arden',
   'Hi Bapo!', 'Mallo', 'Much love, Bapo', '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z'),
  ('debbie_kwan', 'Debbie', 'Kwan', 'deb', 'debbie123', 0, NULL,
   'Hi Debbie!',
   'What up my glip glop. Debbie, you were born with a twin but now you get to have a brother as well. That seems pretty snazzy. You look like a cabbage and you smell like one too. Make sure to checkout Room 40 while you’re in sf.',
   'Much love, Emily and Arden', '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z');

INSERT INTO guest_events (guest_slug, event_slug)
SELECT g.slug, e.slug
FROM guests g
CROSS JOIN (
  SELECT 'courthouse' AS slug UNION ALL
  SELECT 'immediate_family_dinner' UNION ALL
  SELECT 'bus_pick_up' UNION ALL
  SELECT 'wine_tasting' UNION ALL
  SELECT 'vineyard_dinner'
) e;

INSERT INTO guest_polaroids (guest_slug, position, public_id, date_text) VALUES
  ('debbie_kwan', 0, 'wed/guests/debbie_kwan/1', '1 29 2022'),
  ('debbie_kwan', 1, 'wed/guests/debbie_kwan/2', '2007');
