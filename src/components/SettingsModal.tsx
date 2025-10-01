import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import * as GeminiService from '../services/GeminiService';
import { ALL_PERSONAS } from '../personas';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appSettings,
  onSettingsChange
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState(appSettings.selectedModel || 'gemini-2.0-flash-exp');
  const [autoPlayTTS, setAutoPlayTTS] = useState(appSettings.autoPlayTTS ?? false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existingKey = GeminiService.getApiKey();
      if (existingKey) {
        setApiKey(existingKey);
      }
      setSelectedModel(appSettings.selectedModel || 'gemini-2.0-flash-exp');
      setAutoPlayTTS(appSettings.autoPlayTTS ?? false);
    }
  }, [isOpen, appSettings]);

  const handleSave = () => {
    // Save API key
    if (apiKey.trim()) {
      GeminiService.setApiKey(apiKey.trim());
    }

    // Update app settings
    const updatedSettings: AppSettings = {
      ...appSettings,
      selectedModel: selectedModel,
      autoPlayTTS: autoPlayTTS,
    };
    onSettingsChange(updatedSettings);

    // Show success message
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
      onClose();
    }, 1500);
  };

  const handleClearApiKey = () => {
    setApiKey('');
    GeminiService.setApiKey('');
    localStorage.removeItem('gemini_api_key');
  };

  if (!isOpen) return null;

  const apiKeyStatus = GeminiService.getApiKeyStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in">
      <div className="glass-strong rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white border-opacity-10">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 mr-2">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-10"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* API Key Section */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-200">
              Gemini API Key
              <span className="ml-2 text-xs font-normal text-gray-400">
                (Get one from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-assembly-purple hover:text-assembly-purple-dark underline">Google AI Studio</a>)
              </span>
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-grow">
                <input
                  type={apiKeyVisible ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                  disabled={apiKeyStatus.source === 'environment'}
                  className="w-full px-4 py-3 bg-black bg-opacity-30 border border-white border-opacity-20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-assembly-purple focus:ring-2 focus:ring-assembly-purple focus:ring-opacity-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label={apiKeyVisible ? "Hide API key" : "Show API key"}
                >
                  {apiKeyVisible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                      <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              {apiKey && apiKeyStatus.source !== 'environment' && (
                <button
                  onClick={handleClearApiKey}
                  className="px-4 py-3 bg-red-600 bg-opacity-80 hover:bg-opacity-100 text-white rounded-xl transition-all transform hover:scale-105"
                  aria-label="Clear API key"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              {apiKeyStatus.configured ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-assembly-green">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-assembly-green font-medium">
                    API key configured
                    {apiKeyStatus.source && (
                      <span className="text-xs text-gray-400 ml-2">
                        (from {apiKeyStatus.source === 'environment' ? '.env file' : 'settings'})
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-yellow-400">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-yellow-400 font-medium">API key not configured</span>
                </>
              )}
            </div>
            {apiKeyStatus.source === 'environment' && (
              <div className="mt-2 p-3 bg-blue-500 bg-opacity-20 border border-blue-500 border-opacity-30 rounded-lg text-xs text-blue-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline mr-1">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <strong>Using .env file:</strong> API key is loaded from environment. Settings input is disabled to prevent conflicts.
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-200">AI Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-3 bg-black bg-opacity-30 border border-white border-opacity-20 rounded-xl text-white focus:outline-none focus:border-assembly-purple focus:ring-2 focus:ring-assembly-purple focus:ring-opacity-50 transition-all"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id} className="bg-gray-800">
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-play TTS Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-200">Auto-play Text-to-Speech</label>
              <p className="text-xs text-gray-400">Automatically speak AI responses aloud</p>
            </div>
            <button
              onClick={() => setAutoPlayTTS(!autoPlayTTS)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                autoPlayTTS ? 'bg-assembly-green' : 'bg-gray-600'
              }`}
              aria-label="Toggle auto-play TTS"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                  autoPlayTTS ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Active Persona Info */}
          <div className="glass rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-200">Active Persona</h3>
            <div className="flex items-center space-x-3">
              {(() => {
                const activePersona = ALL_PERSONAS.find(p => p.id === appSettings.activePersonaId);
                return activePersona ? (
                  <>
                    <span className="text-3xl">{activePersona.glyph}</span>
                    <div>
                      <p className="text-white font-medium">{activePersona.name}</p>
                      <p className="text-xs text-gray-400">{activePersona.description}</p>
                    </div>
                  </>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white border-opacity-10">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 bg-opacity-50 hover:bg-opacity-70 text-white rounded-xl transition-all transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-mic hover:shadow-xl text-white rounded-xl transition-all transform hover:scale-105 flex items-center space-x-2"
          >
            {showSaveSuccess ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span>Saved!</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
