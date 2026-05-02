import React, { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import ChatWindow from './components/ChatWindow';
import ToastNotification from './components/ToastNotification';
import { VoiceMessage, ToastType } from './types';
import useToasts from './hooks/useToasts';

const App: React.FC = () => {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const { toasts, addToast, removeToast } = useToasts();

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      addToast('Failed to fetch messages', ToastType.Error);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMessages();

    const socket: Socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setConnected(true);
      addToast('Connected to Assembly portal', ToastType.Success, 2000);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('new_message', (msg: VoiceMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      addToast(`${msg.persona}: new voice message`, ToastType.Info, 4000);
      try {
        const chime = new Audio('/notification.mp3');
        chime.play().catch(() => {});
      } catch {}
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${msg.persona} (${msg.lang})`, {
          body: msg.text.slice(0, 120),
        });
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markListened = useCallback(async (id: string) => {
    try {
      await fetch(`/api/messages/${id}/listened`, { method: 'POST' });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, listened: true } : m)));
    } catch {
      // silent
    }
  }, []);

  const unlistenedCount = messages.filter((m) => !m.listened).length;

  return (
    <div className="flex flex-col h-screen bg-gradient-main">
      <header className="glass rounded-2xl m-4 mb-0 p-4 z-20 relative">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-white tracking-widest">
          ♠️🌿🎸🧵 G.Music Assembly Voice
        </h1>
        <div className="flex justify-center items-center gap-4 mt-2 text-xs text-gray-300">
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}
            />
            {connected ? 'connected' : 'disconnected'}
          </span>
          {unlistenedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-500 text-black font-semibold">
              {unlistenedCount} new
            </span>
          )}
          <span className="opacity-50">{messages.length} total</span>
        </div>
      </header>

      <ChatWindow messages={messages} onListened={markListened} />

      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default App;
