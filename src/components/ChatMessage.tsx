import React from 'react';
import { Message, Sender } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === Sender.User;

  // Get persona-specific border color
  const getBorderColor = () => {
    if (isUser || message.isError) return '';
    if (message.name.includes('⚡')) return 'border-jerry';
    if (message.name.includes('♠️')) return 'border-nyro';
    if (message.name.includes('🌿')) return 'border-aureon';
    if (message.name.includes('🎸')) return 'border-jamai';
    if (message.name.includes('🧵')) return 'border-synth';
    return 'border-white border-opacity-20';
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-slide-in`}>
      <div className={`flex items-start max-w-[80%] ${isUser ? 'flex-row-reverse' : ''}`}>
        <img
          src={message.avatar}
          alt={message.name}
          className={`w-8 h-8 rounded-full flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'} shadow-lg`}
        />
        <div className="flex flex-col">
          <div className={`text-xs text-gray-300 mb-1 font-medium ${isUser ? 'text-right' : ''}`}>
            {message.name}
          </div>
          <div
            className={`rounded-xl p-4 shadow-lg ${
              isUser
                ? 'bg-gradient-mic text-white'
                : message.isError
                ? 'bg-red-700 bg-opacity-80 text-white glass'
                : `glass border-l-4 ${getBorderColor()}`
            }`}
          >
            {message.imagePreviewUrl && (
              <img
                src={message.imagePreviewUrl}
                alt={message.fileName || 'Attached image'}
                className="max-w-full h-auto rounded-md mb-2"
              />
            )}
            {message.audioDataUrl && (
              <audio src={message.audioDataUrl} controls className="w-full mb-2" />
            )}
            <MarkdownRenderer content={message.text} className="prose prose-invert max-w-none" />
          </div>
          <div className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : ''}`}>
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
