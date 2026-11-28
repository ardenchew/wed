-- Events move from src/config/events.ts into the database so they can be managed from the admin
-- page. The slugs stay the same, so existing invitations (guest_events) and answers (event_rsvps)
-- keep working; both now reference events and go with an event when it's deleted.

CREATE TABLE events (
  slug        TEXT PRIMARY KEY,   -- stable id; invitations and RSVPs key on it, never changes
  name        TEXT NOT NULL,
  start_time  TEXT NOT NULL,      -- ISO 8601 UTC (`toISOString()`), e.g. 2027-05-14T00:00:00.000Z
  end_time    TEXT,               -- same format; null = no end time given
  location    TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  attire      TEXT,
  image       TEXT,               -- Cloudinary public id, e.g. wed/schedule/courthouse
  map_link    TEXT,               -- http(s) URL
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX events_start ON events (start_time);

-- Seed: the five events from src/config/events.ts. Their times were venue time in PDT (-07:00);
-- stored here in UTC, so 5 PM on May 13 is midnight UTC on May 14.
INSERT INTO events
  (slug, name, start_time, end_time, location, description, attire, image, map_link, created_at, updated_at)
VALUES
  ('courthouse', 'Courthouse Ceremony', '2027-05-14T00:00:00.000Z', NULL, 'San Francisco City Hall',
   'An intimate immediate family only gathering to formalize Emily and Arden’s marriage. Transportation will not be provided so please be sure to arrive on time. A photographer will be present.',
   'Formal', 'wed/schedule/courthouse', 'https://maps.app.goo.gl/W71EYgZxP38jK76J9',
   '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z'),
  ('immediate_family_dinner', 'Dinner', '2027-05-14T03:00:00.000Z', NULL, 'Rich Table',
   'Dinner at an Emily and Arden favorite with immediate family and significant others. We’ll head here straight from the courthouse ceremony, no need to change.',
   'Formal', 'wed/schedule/rich-table', 'https://maps.app.goo.gl/L9Zgzm99FJL5dAFU8',
   '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z'),
  ('bus_pick_up', 'Bus Pick Up', '2027-05-14T17:00:00.000Z', NULL, 'San Francisco',
   'Don’t miss ur bus.',
   'Napa Summer Semi-Formal', 'wed/schedule/bus', NULL,
   '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z'),
  ('wine_tasting', 'Wine Tasting', '2027-05-14T18:00:00.000Z', NULL, 'Stony Hill Vineyard',
   'Tasty napa chardonay and cabernet.',
   'Napa Summer Semi-Formal', 'wed/schedule/stony-hill', 'https://maps.app.goo.gl/LDijnWx6u63XkbqZ9',
   '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z'),
  ('vineyard_dinner', 'Vineyard Dinner', '2027-05-14T23:00:00.000Z', NULL, 'Brix',
   'Tasty napa chardonay and cabernet.',
   'Napa Summer Semi-Formal', 'wed/schedule/brix', 'https://maps.app.goo.gl/TuDigVhhvdszTfif6',
   '2026-11-28T00:00:00.000Z', '2026-11-28T00:00:00.000Z');

-- SQLite can't add a foreign key to an existing table, so rebuild guest_events and event_rsvps
-- with one. Rows for a slug that isn't an event (there should be none) are dropped: no page could
-- show them.

CREATE TABLE guest_events_new (
  guest_slug TEXT NOT NULL REFERENCES guests (slug) ON DELETE CASCADE,
  event_slug TEXT NOT NULL REFERENCES events (slug) ON DELETE CASCADE,
  PRIMARY KEY (guest_slug, event_slug)
);
INSERT INTO guest_events_new (guest_slug, event_slug)
SELECT guest_slug, event_slug FROM guest_events WHERE event_slug IN (SELECT slug FROM events);
DROP TABLE guest_events;
ALTER TABLE guest_events_new RENAME TO guest_events;
CREATE INDEX guest_events_event ON guest_events (event_slug);

CREATE TABLE event_rsvps_new (
  guest_slug TEXT    NOT NULL,
  event_slug TEXT    NOT NULL REFERENCES events (slug) ON DELETE CASCADE,
  attending  INTEGER NOT NULL CHECK (attending IN (0, 1)),
  updated_at TEXT    NOT NULL,
  updated_by TEXT    NOT NULL,
  PRIMARY KEY (guest_slug, event_slug)
);
INSERT INTO event_rsvps_new (guest_slug, event_slug, attending, updated_at, updated_by)
SELECT guest_slug, event_slug, attending, updated_at, updated_by
FROM event_rsvps WHERE event_slug IN (SELECT slug FROM events);
DROP TABLE event_rsvps;
ALTER TABLE event_rsvps_new RENAME TO event_rsvps;
CREATE INDEX event_rsvps_event ON event_rsvps (event_slug);
