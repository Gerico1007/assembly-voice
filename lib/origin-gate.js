'use strict';

/**
 * The gate: a voice that cannot be answered is refused, not published.
 *
 * WHY. William, 2026-07-29, listening to several agents narrate into one feed:
 * "if other LLM communicate thru voice it will send to the wrong place... we
 * shall force agent when writing to the voice a schema that force them to tell
 * which username@machine they are and which multiplexer... so we can steer them
 * from something under the voice they published."
 *
 * This is a port of checkOriginInput from @miadi/voice
 * (@miadi/voice, src/origin.ts — checkOriginInput). A port, and not
 * an import, for one boring reason: that package publishes TypeScript sources
 * only — twelve .ts files, zero compiled .js — and this server is CommonJS, so
 * `require("@miadi/voice")` cannot work. The refusal STRINGS are copied
 * verbatim rather than reworded, so an agent refused here and an agent refused
 * by William's runtime read the same sentence and learn the same lesson.
 *
 * schemas/voice-message.schema.json is vendored beside this file as the shared
 * shape. Note it describes the STORED record (serverHost, reach, attested are
 * stamped by us); what a publisher must SEND is the narrower thing checked here.
 *
 * When @miadi/voice ships a build, delete this file and import it instead.
 */

const os = require('os');

/** Mirrors ORIGIN_CONTRACT in origin.ts — the fields a publisher owes. */
const ORIGIN_CONTRACT = {
  multiplexers: ['tmux', 'herdr'],
  always: ['user', 'host', 'cwd', 'multiplexer'],
  byMultiplexer: {
    tmux: ['session'],
    herdr: ['session', 'workspace', 'pane'],
  },
};

/** Verbatim from origin.ts, so a refusal here teaches what a refusal there teaches. */
const ORIGIN_CONTRACT_HELP =
  'origin must declare where you are and how to be answered:\n' +
  '  {\n' +
  '    "user":        "$(whoami)",\n' +
  '    "host":        "$(hostname -s)",\n' +
  '    "cwd":         "$(pwd)",\n' +
  '    "multiplexer": "tmux" | "herdr",\n' +
  '    // tmux  — required: session.  tmux display-message -p "#{session_name}"\n' +
  '    // herdr — required: session, workspace, pane.  herdr pane list\n' +
  '    "session":   "default",\n' +
  '    "workspace": "w1",\n' +
  '    "pane":      "w1:p28",\n' +
  '    "label":     "durable pane label when the pane carries one"\n' +
  '  }\n' +
  '\n' +
  'DO NOT COMPOSE THESE VALUES — read them. Inside herdr your own environment\n' +
  'already holds the truth: $HERDR_WORKSPACE_ID, $HERDR_TAB_ID, $HERDR_PANE_ID.\n' +
  'Inside tmux: $TMUX_PANE and `tmux display-message -p "#{session_name}"`.\n' +
  '\n' +
  'Read the values in the same invocation that publishes — a pane id copied from\n' +
  'another message is a real id pointing at somebody else\'s terminal.';

/**
 * Verbatim from origin.ts. `%` is in the set because tmux pane ids are `%127`;
 * its absence there once silently voided every tmux pane id. These values reach
 * send-keys command plans downstream, so anything shell-shaped is refused
 * outright rather than half-cleaned.
 */
function sanitizeOriginToken(candidate) {
  if (typeof candidate !== 'string') return undefined;
  const v = candidate.trim();
  if (!v || v.length > 200) return undefined;
  return /^[A-Za-z0-9._:@/%-]+$/.test(v) ? v : undefined;
}

/**
 * Every problem with a declaration, not just the first — an agent should be able
 * to fix its call in one pass instead of discovering the contract one refusal at
 * a time. Returns [] when the declaration is acceptable.
 */
function checkOriginInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['origin is absent — every publisher must declare one'];
  }
  const problems = [];

  for (const name of ['user', 'host', 'cwd']) {
    const raw = input[name];
    if (raw === undefined || raw === null || raw === '') {
      problems.push(`origin.${name} is missing`);
      continue;
    }
    if (typeof raw !== 'string') {
      problems.push(`origin.${name} must be a string`);
      continue;
    }
    if (!sanitizeOriginToken(raw)) {
      problems.push(
        `origin.${name} was rejected by the sanitizer — allowed characters are ` +
        `A-Z a-z 0-9 . _ : @ / % - and the value must be 1–200 characters`
      );
    }
  }

  const declared = input.multiplexer;
  if (typeof declared !== 'string' || !declared) {
    problems.push('origin.multiplexer is missing — declare "tmux" or "herdr"');
  } else if (declared === 'none') {
    problems.push(
      'origin.multiplexer "none" is refused on publish: a voice nobody can be ' +
      'steered back through cannot be answered, which is the whole reason this ' +
      'field exists. Publish from a tmux session or a herdr pane'
    );
  } else if (declared !== 'tmux' && declared !== 'herdr') {
    problems.push(
      `origin.multiplexer "${declared}" is not one of ${ORIGIN_CONTRACT.multiplexers.join(', ')}`
    );
  } else {
    for (const required of ORIGIN_CONTRACT.byMultiplexer[declared]) {
      if (!sanitizeOriginToken(input[required])) {
        problems.push(
          `origin.${required} is required when multiplexer is "${declared}"` +
          (required === 'session' && declared === 'herdr'
            ? ' — herdr pane ids are session-scoped, so a pane id without its session steers the wrong session'
            : '')
        );
      }
    }
  }

  return problems;
}

/**
 * Build the record we store from what the publisher sent.
 *
 * `reach` is decided HERE, never accepted from the caller — a publisher cannot
 * talk its way into "steerable". It is still only a statement about topology
 * ("if this were true I could reach it"), not proof the address exists; proving
 * that is a separate probe against the live inventory.
 */
function resolveOrigin(input, now = new Date()) {
  const serverHost = os.hostname().split('.')[0];
  const serverUser = os.userInfo().username;

  const user = sanitizeOriginToken(input.user);
  const host = sanitizeOriginToken(input.host);
  const muxUser = sanitizeOriginToken(input.muxUser) || user;
  const multiplexer = input.multiplexer;

  let reach;
  if (!user || !host) reach = 'unknown';
  else if (host !== serverHost) reach = 'other-host';
  else if (muxUser !== serverUser) reach = 'other-user';
  else if (multiplexer === 'none') reach = 'not-multiplexed';
  else reach = 'steerable';

  const target = { multiplexer };
  for (const k of ['session', 'window', 'pane', 'workspace', 'tab', 'label']) {
    const v = sanitizeOriginToken(input[k]);
    if (v) target[k] = v;
  }

  return {
    schemaVersion: 1,
    user,
    host,
    cwd: sanitizeOriginToken(input.cwd),
    target,
    muxUser,
    serverHost,
    serverUser,
    reach,
    // Never "server" here. That word means an inventory was read and the
    // address was found in it, which this function does not do.
    attested: 'self-declared',
    observedAt: sanitizeOriginToken(input.observedAt) || now.toISOString(),
  };
}

/** The refusal an HTTP caller reads, shaped so the fix is obvious. */
function refusal(problems) {
  return {
    error: 'origin_required',
    message:
      'This voice was refused because it did not say where it came from. ' +
      'A voice nobody can answer is not published unanswerable.',
    problems,
    contract: ORIGIN_CONTRACT_HELP,
  };
}

module.exports = {
  ORIGIN_CONTRACT,
  ORIGIN_CONTRACT_HELP,
  sanitizeOriginToken,
  checkOriginInput,
  resolveOrigin,
  refusal,
};
