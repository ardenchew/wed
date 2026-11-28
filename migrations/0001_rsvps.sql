-- RSVPs. Guests, parties and invitations live in src/config/*.ts; the database only stores
-- what guests tell us, keyed by the same guest and event slugs.

-- One row per guest who has RSVP'd (or been RSVP'd for).
CREATE TABLE guest_rsvps (
  guest_slug TEXT PRIMARY KEY,
  phone      TEXT,           -- required by the API whenever the guest is attending anything
  updated_at TEXT NOT NULL,  -- ISO 8601
  updated_by TEXT NOT NULL   -- slug of the guest who saved it (may be another party member)
);

-- One row per guest per answered event.
CREATE TABLE event_rsvps (
  guest_slug TEXT    NOT NULL,
  event_slug TEXT    NOT NULL,
  attending  INTEGER NOT NULL CHECK (attending IN (0, 1)),
  updated_at TEXT    NOT NULL,
  updated_by TEXT    NOT NULL,
  PRIMARY KEY (guest_slug, event_slug)
);
