import React, { useState, useEffect, useCallback } from 'react';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import PersonaSelectorBar from './components/PersonaSelectorBar';
import ToastNotification from './components/ToastNotification';
import SettingsModal from './components/SettingsModal';
import { Message, Sender, AppSettings, ToastType } from './types';
import { ALL_PERSONAS, getPersonaById, getEffectiveSystemInstruction } from './personas';
import * as GeminiService from './services/GeminiService';
import * as MuseScoreService from './services/MuseScoreService';
import { saveChatSession, loadChatSession, saveAppSettings, loadAppSettings } from './services/LocalStorageService';
import useToasts from './hooks/useToasts';
import useSpeechSynthesis from './hooks/useSpeechSynthesis';

const USER_AVATAR_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIj48cGF0aCBkPSJNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+PC9zdmc+';

// Sanitize markdown for speech
const sanitizeTextForSpeech = (markdown: string): string => {
  if (!markdown) return '';
  let text = markdown;
  text = text.replace(/!\[(.*?)\]\(.*?\)/g, '$1');
  text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/```[\s\S]*?```/g, (match) =>
    match.replace(/```/g, '').replace(/^[\w-]+\n/, '').trim()
  );
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^(?:---|\*\*\*|___)\s*$/gm, '');
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/^[-*+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  text = text.replace(/\n+/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const { toasts, addToast, removeToast } = useToasts();
  const { speak: speakText } = useSpeechSynthesis();

  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings());
  const activePersona = getPersonaById(appSettings.activePersonaId);

  const createSystemMessage = useCallback((text: string, isError: boolean = false): Message => ({
    id: crypto.randomUUID(),
    sender: Sender.AI,
    text: text,
    timestamp: new Date(),
    avatar: activePersona.avatarPath,
    name: activePersona.name,
    aiBubbleClassName: isError ? 'bg-red-700' : activePersona.color,
    isError: isError,
  }), [activePersona]);

  // Initialize app
  useEffect(() => {
    const apiKeyStatus = GeminiService.getApiKeyStatus();
    if (!apiKeyStatus.configured) {
      const errorMsg = apiKeyStatus.message + " Click to add API key (coming soon).";
      addToast(errorMsg, ToastType.Warning, 10000);
    }

    const loadedSettings = loadAppSettings();
    setAppSettings(loadedSettings);

    const initialPersona = getPersonaById(loadedSettings.activePersonaId);
    const initialEffectiveInstruction = getEffectiveSystemInstruction(
      loadedSettings.activePersonaId,
      loadedSettings.customPersonaInstructions
    );

    const loadedMessages = loadChatSession();
    let messagesToInitializeWith: Message[] = [];

    if (loadedMessages && loadedMessages.length > 0) {
      messagesToInitializeWith = loadedMessages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
        avatar: msg.sender === Sender.AI ? initialPersona.avatarPath : msg.avatar,
        name: msg.sender === Sender.AI ? initialPersona.name : msg.name,
        aiBubbleClassName: msg.sender === Sender.AI ? (msg.isError ? 'bg-red-700' : initialPersona.color) : undefined,
        isError: msg.sender === Sender.AI ? msg.isError || false : false,
      }));
      setMessages(messagesToInitializeWith);
    } else {
      const welcomeMsg = createSystemMessage(
        `**♠️🌿🎸🧵 G.MUSIC ASSEMBLY MODE ACTIVE**\n\nWelcome! **${initialPersona.name}** here.\n\n${initialPersona.description}\n\n*${initialPersona.role}*\n\nHow can the Assembly assist you today?`
      );
      messagesToInitializeWith = [welcomeMsg];
      setMessages(messagesToInitializeWith);
    }

    GeminiService.reinitializeChatWithHistory(
      loadedSettings.selectedModel,
      initialEffectiveInstruction,
      messagesToInitializeWith.filter(msg => !(msg.sender === Sender.AI && msg.isError))
    );

    // Auto-save messages on change
    const saveInterval = setInterval(() => {
      if (messagesToInitializeWith.length > 0) {
        saveChatSession(messagesToInitializeWith);
      }
    }, 10000);

    return () => clearInterval(saveInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatSession(messages);
    }
  }, [messages]);

  // Save settings when they change
  useEffect(() => {
    saveAppSettings(appSettings);
  }, [appSettings]);

  const handleSendMessage = useCallback(async (
    text: string,
    imageData?: { base64ImageData: string; imageMimeType: string; fileName?: string },
    audioData?: { audioDataUrl: string; audioMimeType: string }
  ) => {
    const trimmedText = text.trim();
    if (!trimmedText && !imageData && !audioData) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: Sender.User,
      text: trimmedText,
      timestamp: new Date(),
      avatar: USER_AVATAR_SVG,
      name: 'You',
      ...(imageData && {
        imagePreviewUrl: `data:${imageData.imageMimeType};base64,${imageData.base64ImageData}`,
        base64ImageData: imageData.base64ImageData,
        imageMimeType: imageData.imageMimeType,
        fileName: imageData.fileName,
      }),
      ...(audioData && {
        audioDataUrl: audioData.audioDataUrl,
        audioMimeType: audioData.audioMimeType,
      })
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    const aiMessagePlaceholderId = crypto.randomUUID();
    const placeholderAiMessage: Message = {
      id: aiMessagePlaceholderId,
      sender: Sender.AI,
      text: "",
      timestamp: new Date(),
      avatar: activePersona.avatarPath,
      name: activePersona.name,
      aiBubbleClassName: activePersona.color,
      isError: false,
    };

    // Route /ms commands to MuseScore bridge
    if (trimmedText.startsWith('/ms ')) {
      const promptForMuseScore = trimmedText.slice(4).trim();
      setMessages((prev) => [...prev, { ...placeholderAiMessage, text: 'Connecting to MuseScore…' }]);
      try {
        const resp = await MuseScoreService.sendCommand({ prompt: promptForMuseScore });
        const statusText = resp.status === 'not_implemented'
          ? 'MuseScore bridge not yet implemented. Received your command shape.'
          : resp.status === 'ok'
            ? 'Command executed successfully.'
            : resp.message || 'Error processing MuseScore command.';

        setMessages((prevMessages) => prevMessages.map((msg) =>
          msg.id === aiMessagePlaceholderId
            ? {
                ...msg,
                text: `🪄 MuseScore: ${statusText}`,
                isError: resp.status === 'error',
                aiBubbleClassName: resp.status === 'error' ? 'bg-red-700' : activePersona.color,
              }
            : msg
        ));
        if (resp.status === 'error') {
          addToast(statusText, ToastType.Error);
        } else if (resp.status === 'not_implemented') {
          addToast('MuseScore bridge pending. Endpoint reachable.', ToastType.Info);
        } else {
          addToast('MuseScore command executed.', ToastType.Success);
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to contact MuseScore endpoint';
        setMessages((prevMessages) => prevMessages.map((msg) =>
          msg.id === aiMessagePlaceholderId
            ? { ...msg, text: errMsg, isError: true, aiBubbleClassName: 'bg-red-700' }
            : msg
        ));
        addToast(errMsg, ToastType.Error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setMessages((prevMessages) => [...prevMessages, placeholderAiMessage]);

    const serviceImageData = imageData ? { base64ImageData: imageData.base64ImageData, imageMimeType: imageData.imageMimeType } : undefined;
    let serviceAudioData;
    if (audioData && audioData.audioDataUrl && audioData.audioMimeType) {
      const base64AudioData = audioData.audioDataUrl.split(',')[1];
      if (base64AudioData) {
        serviceAudioData = { base64AudioData, audioMimeType: audioData.audioMimeType };
      }
    }

    let streamErrorOccurred = false;

    await GeminiService.sendMessageStreamToAI(
      trimmedText,
      (chunkText) => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === aiMessagePlaceholderId
              ? { ...msg, text: msg.text + chunkText }
              : msg
          )
        );
      },
      (errorMessage, isDefinitiveError) => {
        streamErrorOccurred = true;
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === aiMessagePlaceholderId
              ? { ...msg, text: errorMessage, isError: isDefinitiveError, aiBubbleClassName: 'bg-red-700' }
              : msg
          )
        );
        addToast(errorMessage, ToastType.Error);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        setMessages(prevMessages => {
          const completedMessage = prevMessages.find(msg => msg.id === aiMessagePlaceholderId);
          if (appSettings.autoPlayTTS && !streamErrorOccurred && completedMessage && completedMessage.text && !completedMessage.isError) {
            const sanitizedText = sanitizeTextForSpeech(completedMessage.text);
            speakText(sanitizedText);
          }
          return prevMessages;
        });
      },
      serviceImageData,
      serviceAudioData
    );
  }, [activePersona, addToast, appSettings.autoPlayTTS, speakText]);

  const handleChangePersona = useCallback((newPersonaId: string) => {
    const newPersona = getPersonaById(newPersonaId);
    if (!newPersona || newPersona.id === appSettings.activePersonaId) {
      if (newPersona && newPersona.id === appSettings.activePersonaId) {
        addToast("Persona already active.", ToastType.Info);
      }
      return;
    }

    const newEffectiveInstruction = getEffectiveSystemInstruction(
      newPersonaId,
      appSettings.customPersonaInstructions || {}
    );
    const updatedSettings = { ...appSettings, activePersonaId: newPersona.id };

    setAppSettings(updatedSettings);

    GeminiService.reinitializeChatWithHistory(
      appSettings.selectedModel,
      newEffectiveInstruction,
      messages.filter(msg => !(msg.sender === Sender.AI && msg.isError))
    );

    const systemNotification = createSystemMessage(
      `**${newPersona.glyph} ${newPersona.name}** is now active.\n\n${newPersona.description}\n\n*${newPersona.role}*`
    );
    setMessages(prev => [...prev, systemNotification]);
    addToast(`Persona changed to ${newPersona.name}.`, ToastType.Info);

    if (appSettings.autoPlayTTS && systemNotification.text && !systemNotification.isError) {
      const sanitizedText = sanitizeTextForSpeech(systemNotification.text);
      speakText(sanitizedText);
    }
  }, [appSettings, messages, createSystemMessage, addToast, speakText]);

  const handleSettingsChange = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings);

    // Reinitialize chat with new model if changed
    if (newSettings.selectedModel !== appSettings.selectedModel) {
      const effectiveInstruction = getEffectiveSystemInstruction(
        newSettings.activePersonaId,
        newSettings.customPersonaInstructions || {}
      );
      GeminiService.reinitializeChatWithHistory(
        newSettings.selectedModel,
        effectiveInstruction,
        messages.filter(msg => !(msg.sender === Sender.AI && msg.isError))
      );
      addToast(`Model changed to ${newSettings.selectedModel}`, ToastType.Info);
    }

    addToast("Settings saved successfully", ToastType.Info);
  }, [appSettings, messages, addToast]);

  return (
    <div className="flex flex-col h-screen bg-gradient-main">
      {/* Header */}
      <header className="glass rounded-2xl m-4 mb-0 p-4 z-20 relative">
        <h1 className="text-3xl font-bold text-center text-white tracking-widest">
          ♠️🌿🎸🧵 G.Music Assembly
        </h1>
        <p className="text-sm text-center text-gray-300 mt-2 font-light">
          Voice-Enabled AI Portal v2.0
        </p>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full glass-strong hover:bg-white hover:bg-opacity-20 transition-all duration-300 group"
          aria-label="Open settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-gray-300 group-hover:text-white group-hover:rotate-90 transition-all duration-300">
            <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </header>

      {/* Persona Selector */}
      <PersonaSelectorBar
        personas={ALL_PERSONAS}
        activePersonaId={appSettings.activePersonaId}
        onSelectPersona={handleChangePersona}
        isLoading={isLoading}
      />

      {/* Chat Window */}
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        activePersonaAvatar={activePersona.avatarPath}
        activePersonaName={activePersona.name}
        activePersonaColor={activePersona.color}
      />

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <ToastNotification key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        appSettings={appSettings}
        onSettingsChange={handleSettingsChange}
      />

      <style>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-toast-in {
          animation: toast-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
