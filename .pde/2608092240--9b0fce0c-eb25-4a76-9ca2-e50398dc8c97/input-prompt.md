# Assembly Voice — the next version

Jerry, 2026-08-09, late, going to bed. Transcribed from voice, partly broken up.

## What he asked

1. "In the current status, what tells an agent to send something to assembly-voice?"
   Is it a skill? A markdown file? How should I trigger it? Can we create a slash
   command for Hermes, for Claude, for Codex? What are the ways I can activate that?
   Is it the monitor? I don't even know.

2. "Would it be easy to have a box to say close the pane? If I listen to the audio
   and I'm pretty sure I can close it and I don't need it anymore, it will generate
   the command to close it. So I just click on the button and it will close the
   session." He asks for a search of how to do that, and an issue.

3. "We built something really great, but we can go further. You guys are really well
   positioned to tell me what we can do, in which direction, WITHOUT REGRESSION."

4. He wants the agents more autonomous — "taking that decision by yourself, not only
   in this actual conversation but in all other with all other kind of agent. Look
   at all what you have access to."

## Verified state today

- The voice portal refuses any publish without an origin declaring user, host, cwd,
  and multiplexer target. Landed 2026-08-09 (PRs #13 #14 #15 #16 #17, all merged).
- A card carries provenance chips, an Open button into the tide cockpit, and two
  copyable jump commands (ssh with bash -lc, and a local one guarded on $HERDR_ENV).
- 415 messages. 6 carry origin. 407 legacy records render as "no address".
- herdr CAN close things: `herdr pane close <pane_id>`, `herdr tab close`,
  `herdr workspace close`. tmux: `kill-pane`, `kill-session`.
- Skills that touch voice today: media/assembly-voice-bus-publish (explicitly NOT
  for plain TTS — it is the Redis/PubSub fabric layer), .archive/media/
  telegram-voice-handoffs (archived), miadi/miadi-pr-miette-relational-perspective
  (a specialised review-audio path with its own generate_review_audio.py).
  NONE of them teach the basic act of speaking, and NONE know about the origin gate.
- No slash command exists for any agent runtime.
- docs/voice-publishing.md exists in the repo and is what the five agents read last
  night, but an agent only finds it if a human pastes the path.

## The tension

Five agents spoke last night only because a 1231-character prompt was hand-written
and sent into each of their panes. The capability is real and it is undiscoverable.
An agent that would benefit from speaking has no way to learn that it can.

Second tension: closing a pane is destructive and irreversible, while steering is
guarded by preview and a single-use confirmation. A close button must not be easier
to press than a steer.
