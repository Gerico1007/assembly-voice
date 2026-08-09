import React, { useState } from 'react';
import { VoiceMessage, ToastType } from '../types';
import useToasts from '../hooks/useToasts';
import { withRuntimeBasePath } from '../runtimePaths';
import { readProvenance, jumpCommand } from '../lib/provenance';

interface ChatMessageProps {
  message: VoiceMessage;
  onListened: (id: string) => void;
}

const PERSONA_DISPLAY: Record<string, { glyph: string; name: string; border: string }> = {
  jerry:  { glyph: '⚡', name: 'Jerry',  border: 'border-jerry'  },
  nyro:   { glyph: '♠️', name: 'Nyro',   border: 'border-nyro'   },
  aureon: { glyph: '🌿', name: 'Aureon', border: 'border-aureon' },
  jamai:  { glyph: '🎸', name: 'JamAI',  border: 'border-jamai'  },
  synth:  { glyph: '🧵', name: 'Synth',  border: 'border-synth'  },
  salix:  { glyph: '🌿', name: 'Salix',  border: 'border-aureon' },
};

const LANG_FLAG: Record<string, string> = { fr: '🇫🇷', en: '🇬🇧' };

const formatRelative = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onListened }) => {
  const persona = PERSONA_DISPLAY[message.persona] || {
    glyph: '🧵',
    name: message.persona,
    border: 'border-white border-opacity-20',
  };
  const { addToast } = useToasts();
  const [expanded, setExpanded] = useState(false);
  // 140 was fine when messages were one line. An agent describing its own room
  // speaks for ~40 seconds, which is 300–600 characters, so every one of them
  // hit the ellipsis and the transcript stopped being readable — you could hear
  // the message or tap it open, but not simply read it. The point of having text
  // beside audio is choosing which one you have time for.
  const isLong = message.text.length > 900;
  const displayed = expanded || !isLong ? message.text : message.text.slice(0, 140) + '…';

  const handlePlay = () => {
    if (!message.listened) onListened(message.id);
  };

  const prov = readProvenance(message);

  // Where the speaker actually said it was. Never a default: a message that
  // declared no cwd used to be handed "/home/gmusic/salix/repos/assembly-voice",
  // which is invention presented as fact.
  const cwd = message.origin?.cwd || message.pwd || null;
  const sshTarget = message.origin?.user && message.origin?.host
    ? `${message.origin.user}@${message.origin.host}`
    : null;

  const copySSH = (e: React.MouseEvent) => {
    e.stopPropagation();
    // The old line was hardcoded to gmusic@eury.ferret-harmonic.ts.net for every
    // message, so a voice from another machine handed the listener a door to
    // this one. That is the exact bug the origin field was introduced to end.
    if (!sshTarget) return;
    const command = cwd
      ? `ssh -t ${sshTarget} "cd ${cwd} && exec bash"`
      : `ssh -t ${sshTarget}`;
    navigator.clipboard.writeText(command);
    addToast('SSH command copied to clipboard', ToastType.Success, 2000);
  };

  const copyPWD = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cwd) return;
    navigator.clipboard.writeText(`cd ${cwd}`);
    addToast('CD command copied to clipboard', ToastType.Success, 2000);
  };

  // The other road to the same room: the cockpit link is for a thumb, this is
  // for a keyboard. Copy, paste into any terminal, and you are standing in the
  // pane that spoke.
  const jump = message.origin ? jumpCommand(message.origin) : null;
  const copyJump = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!jump) return;
    navigator.clipboard.writeText(jump);
    addToast(
      message.origin?.target.multiplexer === 'herdr'
        ? 'Copied — opens the herdr tab holding that pane'
        : 'Copied — attaches and selects that exact pane',
      ToastType.Success,
      2600
    );
  };

  return (
    <div className="animate-slide-in">
      <div className={`glass border-l-4 ${persona.border} rounded-xl p-4 shadow-lg`}>
        <div className="flex items-center justify-between gap-2 mb-2 text-sm">
          <span className="font-semibold text-white">
            {persona.glyph} {persona.name}
          </span>
          <div className="flex items-center gap-2">
            {/* Absence beats invention: no cwd, no cd button. */}
            {cwd && (
              <button
                onClick={copyPWD}
                className="text-[10px] bg-white bg-opacity-10 hover:bg-opacity-20 text-gray-300 px-1.5 py-0.5 rounded border border-white border-opacity-10 transition-all uppercase font-bold tracking-tighter"
                title={`cd ${cwd}`}
              >
                pwd
              </button>
            )}
            {sshTarget && (
              <button
                onClick={copySSH}
                className="text-[10px] bg-white bg-opacity-10 hover:bg-opacity-20 text-gray-300 px-1.5 py-0.5 rounded border border-white border-opacity-10 transition-all uppercase font-bold tracking-tighter"
                title={`ssh ${sshTarget}`}
              >
                ssh
              </button>
            )}
            {jump && (
              <button
                onClick={copyJump}
                className="text-[10px] bg-amber-500 bg-opacity-20 hover:bg-opacity-40 text-amber-200 px-1.5 py-0.5 rounded border border-amber-500 border-opacity-40 transition-all uppercase font-bold tracking-tighter"
                title={jump}
              >
                jump
              </button>
            )}
            <span className="flex items-center gap-2 text-xs text-gray-300">
              <span>{LANG_FLAG[message.lang] ?? message.lang}</span>
              <span>{formatRelative(message.timestamp)}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  message.listened ? 'bg-gray-500' : 'bg-yellow-400 animate-pulse'
                }`}
                title={message.listened ? 'listened' : 'unlistened'}
              />
            </span>
          </div>
        </div>

        <div
          className={`text-gray-100 text-sm mb-3 leading-relaxed ${
            isLong ? 'cursor-pointer hover:text-white' : ''
          }`}
          onClick={() => isLong && setExpanded((v) => !v)}
          title={isLong ? (expanded ? 'collapse' : 'expand') : undefined}
        >
          {displayed}
        </div>

        <audio
          src={withRuntimeBasePath(message.audio_file)}
          controls
          preload="none"
          onPlay={handlePlay}
          className="w-full"
        />

        {/*
          Provenance sits BETWEEN the audio and the action, and that order is
          deliberate. The transcript is the index — you scan text to decide what
          to play. The audio is the commitment. Provenance is the warrant, and it
          arrives exactly when the decision is forming, thumb already near the
          button. The action is the consequence, and never appears above its own
          warrant.
        */}
        {prov.verdict && (
          <p className="mt-3 text-[11px] leading-relaxed text-amber-200/90">
            {prov.verdict}
          </p>
        )}

        {prov.chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {prov.chips.map((c, i) => (
              <span
                key={i}
                className={
                  'text-[10px] font-mono px-2 py-0.5 rounded-full border ' +
                  (c.tone === 'ok'
                    ? 'border-green-500/40 bg-green-500/10 text-green-300'
                    : c.tone === 'warn'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                    : c.tone === 'solid'
                    ? 'border-purple-400/40 bg-purple-400/10 text-purple-200'
                    : c.tone === 'guess'
                    ? 'border-dashed border-gray-500/40 text-gray-500'
                    : 'border-white/10 text-gray-400')
                }
              >
                {c.text}
              </span>
            ))}
          </div>
        )}

        {prov.action && (
          <div className="mt-3">
            <a
              href={prov.action.href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                'inline-block text-[11px] font-mono font-bold px-3 py-2 rounded-lg border transition-all ' +
                (prov.state === 'verified'
                  ? 'border-amber-500 bg-amber-500 text-gray-900 hover:bg-amber-400'
                  : 'border-amber-600/50 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40')
              }
            >
              {prov.action.label}
            </a>
            {prov.consequence && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-gray-500">
                {prov.consequence}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
