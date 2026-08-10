import React, { useState } from 'react';
import { VoiceMessage, ToastType } from '../types';
import useToasts from '../hooks/useToasts';
import { withRuntimeBasePath } from '../runtimePaths';
import { readProvenance, sshJumpCommand, localJumpCommand } from '../lib/provenance';

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

  // Two roads to the same room, and the old buttons were neither. `pwd` copied
  // a cd into a directory and `ssh` copied a hardcoded host — the same two
  // strings on every card, telling you nothing about where THIS voice came
  // from and dropping you nowhere near the pane that spoke.
  //
  //   remote · you are elsewhere, so hop the host first
  //   pane   · you are already on the box, so just go
  const remoteJump = message.origin ? sshJumpCommand(message.origin) : null;
  const localJump = message.origin ? localJumpCommand(message.origin) : null;

  const copy = (text: string, toast: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    addToast(toast, ToastType.Success, 2600);
  };

  return (
    <div className="animate-slide-in">
      <div className={`glass border-l-4 ${persona.border} rounded-xl p-4 shadow-lg`}>
        <div className="flex items-center justify-between gap-2 mb-2 text-sm">
          <span className="font-semibold text-white">
            {persona.glyph} {persona.name}
          </span>
          <div className="flex items-center gap-2">
            {remoteJump && (
              <button
                onClick={copy(remoteJump, 'Copied — ssh in and land on that pane')}
                className="text-[10px] bg-white bg-opacity-10 hover:bg-opacity-20 text-gray-300 px-1.5 py-0.5 rounded border border-white border-opacity-10 transition-all uppercase font-bold tracking-tighter"
                title={remoteJump}
              >
                ssh
              </button>
            )}
            {localJump && (
              <button
                onClick={copy(localJump, 'Copied — moves the herdr you already have open')}
                className="text-[10px] bg-amber-500 bg-opacity-20 hover:bg-opacity-40 text-amber-200 px-1.5 py-0.5 rounded border border-amber-500 border-opacity-40 transition-all uppercase font-bold tracking-tighter"
                title={localJump}
              >
                pane
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
