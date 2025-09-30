import { Message, AppSettings } from '../types';
import { DEFAULT_PERSONA_ID } from '../personas';

const CHAT_SESSION_STORAGE_KEY = 'gmusic_assembly_chat_session';
const APP_SETTINGS_STORAGE_KEY = 'gmusic_assembly_app_settings';

export const saveChatSession = (messages: Message[]): void => {
  try {
    const serializedMessages = JSON.stringify(messages);
    localStorage.setItem(CHAT_SESSION_STORAGE_KEY, serializedMessages);
    console.log('Chat session saved to localStorage');
  } catch (error) {
    console.error('Error saving chat session:', error);
  }
};

export const loadChatSession = (): Message[] | null => {
  try {
    const serializedMessages = localStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    if (serializedMessages === null) {
      return null;
    }
    return JSON.parse(serializedMessages);
  } catch (error) {
    console.error('Error loading chat session:', error);
    return null;
  }
};

export const clearChatSessionFromStorage = (): void => {
  try {
    localStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
    console.log('Chat session cleared from localStorage');
  } catch (error) {
    console.error('Error clearing chat session:', error);
  }
};

export const saveAppSettings = (settings: AppSettings): void => {
  try {
    const serializedSettings = JSON.stringify(settings);
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, serializedSettings);
    console.log('App settings saved to localStorage');
  } catch (error) {
    console.error('Error saving app settings:', error);
  }
};

export const loadAppSettings = (): AppSettings => {
  try {
    const serializedSettings = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (serializedSettings === null) {
      return getDefaultSettings();
    }
    const loadedSettings = JSON.parse(serializedSettings);
    return { ...getDefaultSettings(), ...loadedSettings };
  } catch (error) {
    console.error('Error loading app settings:', error);
    return getDefaultSettings();
  }
};

function getDefaultSettings(): AppSettings {
  return {
    activePersonaId: DEFAULT_PERSONA_ID,
    selectedModel: 'gemini-2.0-flash-exp',
    autoPlayTTS: false,
    customPersonaInstructions: {}
  };
}
