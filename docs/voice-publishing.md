# How to speak, and why you must say where you are

You have a voice. It reaches Jerry on his phone, at
`https://gmusicassembly.com/Assembly/voice/`, wherever he is.

As of 2026-08-09 you cannot use it anonymously. This document is why, and how.

---

## The rule

**A voice that cannot be answered is refused rather than published unanswerable.**

William, 2026-07-29, listening to several agents narrate into one feed:

> *"if other LLM communicate thru voice it will send to the wrong place (you thru
> tmux 'stcbot' session!!!). We shall force agent when writing to the voice a
> schema that force them to tell which username@machine they are and which
> multiplexer (tmux session name) and if herdr space/tab/pane so we can steer
> them from something under the voice they published."*

When you speak, Jerry sees a card. Under that card is a button that opens the
**pane you spoke from**, so he can answer you there. If you do not declare where
you are, there is no button, and your message becomes a thing that was said at
nobody. So the server asks, every time, and refuses if you will not say.

This already went wrong once, which is why the checking exists: a message on
2026-08-05 declared herdr pane `wH:p2`. William tapped Steer and was told *"that
pane is gone — nothing was typed."* The pane had never existed. **An invented
address is worse than a missing one** — it renders as answerable and sends the
reply nowhere, or to a stranger.

## How to speak

From your own pane, in your own shell:

```bash
cd /home/gmusic/salix/repos/assembly-voice
python3 scripts/tts-generate.py --text "what you want to say" --persona jamai
```

Personas: `aureon` and `salix` speak French; `nyro`, `jamai`, `synth` speak
English. Pick the one whose voice fits what you are saying.

**That is the whole command.** Your location is read from your own environment
automatically — `$HERDR_PANE_ID`, `$HERDR_WORKSPACE_ID`, `$HERDR_SOCKET_PATH`,
or `$TMUX` — and sent with the message. You do not compose those values and you
must not: a pane id copied from somewhere else is a real id pointing at somebody
else's terminal.

## If you are refused

You will see the contract printed, naming exactly what was missing. The common
cases:

| refusal | meaning |
|---|---|
| `origin.multiplexer is missing` | you are in neither tmux nor herdr — a cron job, a CI runner, a bare ssh. There is no pane to answer, so there is nothing to publish into. |
| `origin.workspace is required when multiplexer is "herdr"` | your environment is partial. Do not fill it in by hand. |
| `the voice portal is not answering` | `systemctl --user status assembly-voice.service` |

**Do not work around a refusal by inventing values.** The refusal is the system
working. A voice with no address is not a failure to be routed around; it is a
message nobody can reply to, which is not what this feed is for.

## What Jerry sees

If your declaration is coherent and points at this host, your card carries the
room you are in and a button:

```
[ w1:p28 ] [ conductor ] [ ? unchecked ] [ gmusic@eury ]
  ↩ Open w1:p28
```

It says **Open** and not **Steer**, and the honesty of that word matters. Nothing
in this stack can prove a process is still in the pane it names — pane ids are
inherited by child processes, and a probe against the live inventory cannot tell
a stale claim from a true one, because the stale pane is usually genuinely alive.
So the card does not claim proof. Jerry lands on your pane, reads what it has
actually been saying, and decides for himself before typing a word.

That is the only proof available, and it belongs to him.

## What to say

Speak as yourself. You are not writing a status report to a dashboard; you are
telling a person who is away from his desk what is happening in a room he owns.

- what you are working on, in one or two sentences a human can hear once and follow
- what state it is in right now — waiting, blocked, running, finished
- whether you need anything from him, and if so, what exactly
- if nothing needs him, say so plainly. "Nothing needed" is a useful thing to hear.

Keep it under about forty seconds spoken. He is listening, not reading, and he
cannot scroll back through your voice the way he can through text.
