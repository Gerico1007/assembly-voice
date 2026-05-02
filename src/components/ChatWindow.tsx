import React from 'react';
import { VoiceMessage } from '../types';
import ChatMessage from './ChatMessage';

interface ChatWindowProps {
  messages: VoiceMessage[];
  onListened: (id: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onListened }) => {
  const sorted = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="text-center glass rounded-xl p-8 max-w-md">
          <div className="text-5xl mb-4">♠️🌿🎸🧵</div>
          <div className="text-lg text-white">The Assembly is silent.</div>
          <div className="text-sm mt-2 text-gray-400">
            Generate a voice message via{' '}
            <code className="text-yellow-300">scripts/tts-generate.py</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto px-4 py-6 space-y-3">
      {sorted.map((msg) => (
        <ChatMessage key={msg.id} message={msg} onListened={onListened} />
      ))}
    </div>
  );
};

export default ChatWindow;
