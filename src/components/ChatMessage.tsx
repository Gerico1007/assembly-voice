import React, { useState } from 'react';
import { VoiceMessage, ToastType } from '../types';
import useToasts from '../hooks/useToasts';
import { withRuntimeBasePath } from '../runtimePaths';

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
  const isLong = message.text.length > 140;
  const displayed = expanded || !isLong ? message.text : message.text.slice(0, 140) + '…';

  const handlePlay = () => {
    if (!message.listened) onListened(message.id);
  };

  const copySSH = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pwd = message.pwd || '/home/gmusic/salix/repos/assembly-voice';
    const command = `ssh -t gmusic@eury.ferret-harmonic.ts.net "cd ${pwd} && exec bash"`;
    navigator.clipboard.writeText(command);
    addToast('SSH command copied to clipboard', ToastType.Success, 2000);
  };

  const copyPWD = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pwd = message.pwd || '/home/gmusic/salix/repos/assembly-voice';
    const command = `cd ${pwd}`;
    navigator.clipboard.writeText(command);
    addToast('CD command copied to clipboard', ToastType.Success, 2000);
  };

  return (
    <div className="animate-slide-in">
      <div className={`glass border-l-4 ${persona.border} rounded-xl p-4 shadow-lg`}>
        <div className="flex items-center justify-between gap-2 mb-2 text-sm">
          <span className="font-semibold text-white">
            {persona.glyph} {persona.name}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={copyPWD}
              className="text-[10px] bg-white bg-opacity-10 hover:bg-opacity-20 text-gray-300 px-1.5 py-0.5 rounded border border-white border-opacity-10 transition-all uppercase font-bold tracking-tighter"
              title="Copy CD command"
            >
              pwd
            </button>
            <button
              onClick={copySSH}
              className="text-[10px] bg-white bg-opacity-10 hover:bg-opacity-20 text-gray-300 px-1.5 py-0.5 rounded border border-white border-opacity-10 transition-all uppercase font-bold tracking-tighter"
              title="Copy SSH command"
            >
              ssh
            </button>
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
      </div>
    </div>
  );
};

export default ChatMessage;
