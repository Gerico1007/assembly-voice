import type { VoiceMessage, VoiceOrigin } from '../types';

/**
 * What a card is allowed to say about where a voice came from.
 *
 * The rule under all of this is one sentence from the plan: absence beats
 * invention. A card with no room chips reads as "unknown room"; a card with the
 * WRONG room sends the listener into somebody else's terminal.
 *
 * There are seven states, not two, and the six that are not "verified" are
 * where the operator's trust is actually built. A guard that has never refused
 * you is just a door you have not tried.
 */
export type CardState =
  | 'verified'        // declared, and the server found it in the live inventory
  | 'unverified'      // declared honestly, nothing could check it
  | 'legacy'          // published before addresses existed at all
  | 'other-host'      // another machine; nothing here can reach it
  | 'other-user'      // another person's multiplexer on this machine
  | 'no-pane'         // no terminal behind it
  | 'malformed';      // something was declared and none of it resolved

export interface Provenance {
  state: CardState;
  origin?: VoiceOrigin;
  /** The one sentence under the player. Empty for `verified` — the chip says it. */
  verdict: string;
  /** What tapping would do, and what it would not. */
  consequence: string;
  /** Shown on the action, or null when there is nothing honest to offer. */
  action: { label: string; href: string } | null;
  /** Room chips, already treated. */
  chips: { text: string; tone: 'solid' | 'outline' | 'guess' | 'warn' | 'ok' }[];
}

/** Where the cockpit lives. Tailnet by default — never the public domain. */
const COCKPIT =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_TIDE_COCKPIT_URL ||
  'http://eury.ferret-harmonic.ts.net:3399/api/tide/console';

/**
 * The deep link. It carries the pane, its durable label and a draft reply —
 * and deliberately NO credential. A steer token is a shell on the daemon host;
 * in a URL it would live in this page, in history, and in every screenshot of
 * this card. The operator signs in to the cockpit once; this is only a place
 * to land.
 */
export function cockpitLink(o: VoiceOrigin, draft = ''): string | null {
  const t = o.target;
  if (t.multiplexer === 'herdr' && t.pane) {
    const q = new URLSearchParams({ mux: 'herdr', pane: t.pane });
    if (t.label) q.set('label', t.label);
    if (draft) q.set('msg', draft);
    return `${COCKPIT}?${q}`;
  }
  if (t.multiplexer === 'tmux' && t.pane) {
    const q = new URLSearchParams({ mux: 'tmux', pane: t.pane.replace(/^%/, '') });
    if (draft) q.set('msg', draft);
    return `${COCKPIT}?${q}`;
  }
  return null;
}

/** Short hostnames are what a shell reports; reaching one needs the tailnet. */
const TAILNET_SUFFIX =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_TAILNET_SUFFIX || '.ferret-harmonic.ts.net';

/**
 * The command that puts you IN the pane, for when you are at a keyboard rather
 * than on a phone.
 *
 * The cockpit link and this are the same destination by two roads: one for a
 * thumb, one for a terminal. Neither is a substitute for the other — answering
 * from a walk and sitting down in the room are different acts.
 *
 * herdr has no `pane focus <id>`; focus is directional only. So herdr lands you
 * on the pane's TAB, which is as close as its CLI allows, and the pane is named
 * in a comment so you can see which one you were sent for. tmux can select the
 * exact pane, and does.
 */
export function jumpCommand(o: VoiceOrigin): string | null {
  const t = o.target;
  const host = o.host && !o.host.includes('.') ? `${o.host}${TAILNET_SUFFIX}` : o.host;
  const ssh = o.user && host ? `ssh -t ${o.user}@${host} ` : '';

  if (t.multiplexer === 'herdr' && t.workspace && t.session) {
    const focus = [
      `herdr workspace focus ${t.workspace}`,
      t.tab ? `herdr tab focus ${t.tab}` : null,
      `herdr session attach ${t.session}`,
    ]
      .filter(Boolean)
      .join(' && ');
    const note = t.pane ? `   # pane ${t.pane}${t.label ? ` · ${t.label}` : ''}` : '';
    return ssh ? `${ssh}'${focus}'${note}` : `${focus}${note}`;
  }

  if (t.multiplexer === 'tmux' && t.session) {
    const sel = t.pane ? ` \\; select-pane -t ${t.pane}` : '';
    const inner = `tmux attach -t ${t.session}${sel}`;
    return ssh ? `${ssh}'${inner}'` : inner;
  }

  return null;
}

export function readProvenance(m: VoiceMessage): Provenance {
  const o = m.origin;

  // No origin at all — every record published before 2026-08-08. Not a failure,
  // a different era, and the copy should say which.
  if (!o) {
    return {
      state: 'legacy',
      verdict:
        'Published before the portal asked where a voice came from. Nobody ' +
        'verified an address then, and the pane list has turned over many times since.',
      consequence: m.pwd ? 'You can still go where it was working.' : '',
      action: null,
      chips: [{ text: '? no address', tone: 'outline' }],
    };
  }

  const t = o.target;
  const who = `${o.user ?? '?'}@${o.host ?? '?'}`;
  const room: Provenance['chips'] = [];
  if (t.workspace) room.push({ text: `▸ ${t.workspace}`, tone: 'solid' });
  if (t.tab) room.push({ text: t.tab, tone: 'outline' });
  if (t.pane) room.push({ text: t.pane, tone: 'solid' });
  if (t.label) room.push({ text: t.label, tone: 'solid' });
  if (t.session && t.multiplexer === 'tmux') room.push({ text: t.session, tone: 'solid' });

  const dim = (c: Provenance['chips']) =>
    c.map((x) => ({ ...x, tone: 'outline' as const }));

  if (o.reach === 'other-host') {
    return {
      state: 'other-host',
      origin: o,
      verdict:
        `Published from ${o.host}, not from this machine. Nothing here can reach ` +
        `a terminal on another host, so there is no way in from this card.`,
      consequence: `To answer it, get onto ${o.host} yourself.`,
      action: null,
      chips: [{ text: `↗ ${who}`, tone: 'warn' }, ...dim(room)],
    };
  }

  if (o.reach === 'other-user') {
    return {
      state: 'other-user',
      origin: o,
      verdict:
        `This pane belongs to ${o.muxUser}'s multiplexer, not yours. Sockets are ` +
        `private to their owner, so there is no way in from here.`,
      consequence: `Send the address to ${o.muxUser} — only their own session can type there.`,
      action: null,
      chips: [{ text: `⊘ mux owner: ${o.muxUser}`, tone: 'warn' }, ...dim(room)],
    };
  }

  if (o.reach === 'not-multiplexed' || t.multiplexer === 'none') {
    return {
      state: 'no-pane',
      origin: o,
      verdict:
        'No terminal behind this one — a script, a hook, or a person at a browser. ' +
        'There is nowhere to send a reply.',
      consequence: o.cwd ? 'You can still go where it was working.' : '',
      action: null,
      chips: [{ text: 'no pane', tone: 'outline' }],
    };
  }

  if (o.reach === 'unknown') {
    return {
      state: 'malformed',
      origin: o,
      verdict:
        'Something was declared here and none of it resolved. The card is not ' +
        'guessing at what was meant.',
      consequence: '',
      action: null,
      chips: [{ text: '? unresolved', tone: 'outline' }],
    };
  }

  // reach === 'steerable'. The declaration is coherent and points at this host.
  const href = cockpitLink(o);

  if (o.attested === 'server') {
    return {
      state: 'verified',
      origin: o,
      verdict: '',
      consequence:
        'The cockpit re-resolves this pane before anything is typed — if it has ' +
        'gone you will be told, and nothing will have been sent.',
      action: href ? { label: '↩ Steer', href } : null,
      chips: [...room, { text: '✓ live', tone: 'ok' }, { text: who, tone: 'outline' }],
    };
  }

  // Declared, and nothing has checked it. This is the honest default today:
  // nothing in the stack can prove a process is still in the pane it names,
  // because the pane id is inherited by child processes and no probe can
  // distinguish a stale claim from a true one. So the verb is Open, not Steer —
  // the operator confirms with their own eyes, which is the only proof there is.
  return {
    state: 'unverified',
    origin: o,
    verdict:
      `${m.persona || 'This voice'} says it is in ${t.pane ?? t.session}. Nothing has ` +
      `checked that. The address may be exact or may be stale; this card cannot tell you which.`,
    consequence:
      'Opening it shows you that pane\'s recent output before you type anything. ' +
      'You will be able to see for yourself whether it is the one that spoke.',
    action: href ? { label: `↩ Open ${t.pane ?? t.session}`, href } : null,
    chips: [...dim(room), { text: '? unchecked', tone: 'warn' }, { text: who, tone: 'outline' }],
  };
}
