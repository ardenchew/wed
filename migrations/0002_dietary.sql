-- Free-text dietary restrictions per guest (optional; only asked of guests who are attending).
ALTER TABLE guest_rsvps ADD COLUMN dietary TEXT;
