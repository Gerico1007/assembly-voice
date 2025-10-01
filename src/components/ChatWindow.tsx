import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import ChatMessage from './ChatMessage';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  activePersonaAvatar: string;
  activePersonaName: string;
  activePersonaColor: string; // Keep for potential future use
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  activePersonaAvatar,
  activePersonaName,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-grow overflow-y-auto px-4 py-6 space-y-2">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <div className="flex justify-start mb-4 animate-slide-in">
          <div className="flex items-start">
            <img
              src={activePersonaAvatar}
              alt={activePersonaName}
              className="w-8 h-8 rounded-full mr-2 shadow-lg"
            />
            <div className="glass rounded-xl p-4 shadow-lg">
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
