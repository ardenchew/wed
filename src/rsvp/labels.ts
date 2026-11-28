import { rsvpStatus, type PartyMemberRsvp } from './shared';

/** Human label for one guest's RSVP status, e.g. "Attending 2 of 5". */
export function statusLabel(member: Pick<PartyMemberRsvp, 'events' | 'responses'>): string {
  const status = rsvpStatus(member);
  if (status === 'yes') return 'Attending';
  if (status === 'no') return 'Not attending';
  if (status === 'pending') return 'No response yet';
  const yes = member.events.filter((slug) => member.responses[slug] === true).length;
  return `Attending ${yes} of ${member.events.length}`;
}
