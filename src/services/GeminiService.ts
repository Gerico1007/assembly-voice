import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { Message, Sender } from '../types';

const GEMINI_API_KEY_STORAGE_KEY = 'gemini_api_key';

// API and chat session management
let apiKey: string | null = null;
let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;
let chatSession: ChatSession | null = null;
let currentModel: string = 'gemini-2.0-flash-exp';
let currentSystemInstruction: string = '';

// Initialize API key from environment variable if available
const initApiKey = (): string | null => {
  // First check environment variable (from .env file)
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envApiKey && envApiKey.trim() !== '' && envApiKey !== 'your_api_key_here') {
    return envApiKey;
  }

  // Fall back to localStorage
  return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
};

export const getApiKeyStatus = (): { configured: boolean; message: string; source?: string } => {
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const hasEnvKey = envApiKey && envApiKey.trim() !== '' && envApiKey !== 'your_api_key_here';

  if (hasEnvKey) {
    apiKey = envApiKey;
    return {
      configured: true,
      message: 'Gemini API key is configured.',
      source: 'environment'
    };
  }

  apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);

  if (!apiKey || apiKey.trim() === '') {
    return {
      configured: false,
      message: 'Gemini API key is not configured.'
    };
  }

  return {
    configured: true,
    message: 'Gemini API key is configured.',
    source: 'localStorage'
  };
};

export const setApiKey = (key: string): void => {
  apiKey = key;
  localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
  // Reinitialize API client with new key
  if (key && key.trim()) {
    genAI = new GoogleGenerativeAI(key);
  }
};

export const getApiKey = (): string | null => {
  if (!apiKey) {
    apiKey = initApiKey();
  }
  return apiKey;
};

// Initialize or get the generative AI instance
const getGenAI = (): GoogleGenerativeAI => {
  if (!genAI) {
    const key = getApiKey();
    if (!key) {
      throw new Error('API key not configured');
    }
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
};

export const reinitializeChatWithHistory = (
  modelId: string,
  systemInstruction: string,
  historyMessages: Message[]
): void => {
  try {
    currentModel = modelId;
    currentSystemInstruction = systemInstruction;

    const genAI = getGenAI();

    // Create model with system instruction
    model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: systemInstruction,
    });

    // Convert message history to Gemini format
    const history = historyMessages
      .filter(msg => !msg.isError && msg.text && msg.text.trim())
      .map(msg => ({
        role: msg.sender === Sender.User ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    // Start new chat session with history
    chatSession = model.startChat({
      history: history,
    });

    console.log('✓ Chat session initialized with Gemini API', {
      model: modelId,
      historyLength: history.length
    });
  } catch (error) {
    console.error('Error initializing chat session:', error);
    chatSession = null;
  }
};

export const resetChatSession = (systemInstruction: string): void => {
  try {
    currentSystemInstruction = systemInstruction;

    const genAI = getGenAI();

    model = genAI.getGenerativeModel({
      model: currentModel,
      systemInstruction: systemInstruction,
    });

    chatSession = model.startChat({
      history: [],
    });

    console.log('✓ Chat session reset');
  } catch (error) {
    console.error('Error resetting chat session:', error);
    chatSession = null;
  }
};

export const sendMessageStreamToAI = async (
  userText: string,
  onChunk: (chunkText: string) => void,
  onError: (errorMessage: string, isDefinitive: boolean) => void,
  onComplete: () => void,
  imageData?: { base64ImageData: string; imageMimeType: string },
  audioData?: { base64AudioData: string; audioMimeType: string }
): Promise<void> => {
  const keyStatus = getApiKeyStatus();
  if (!keyStatus.configured) {
    onError('API key not configured. Please add your Gemini API key in settings.', true);
    return;
  }

  try {
    // Initialize chat session if not already done
    if (!chatSession || !model) {
      reinitializeChatWithHistory(currentModel, currentSystemInstruction, []);
    }

    if (!chatSession) {
      onError('Failed to initialize chat session', true);
      return;
    }

    // Build the message parts
    const parts: any[] = [];

    // Add text if present
    if (userText && userText.trim()) {
      parts.push({ text: userText });
    }

    // Add image if present
    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.base64ImageData,
          mimeType: imageData.imageMimeType
        }
      });
    }

    // Add audio if present
    if (audioData) {
      parts.push({
        inlineData: {
          data: audioData.base64AudioData,
          mimeType: audioData.audioMimeType
        }
      });
    }

    if (parts.length === 0) {
      onError('No content to send', true);
      return;
    }

    // Send message and get streaming response
    const result = await chatSession.sendMessageStream(parts);

    // Stream the response chunks
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        onChunk(chunkText);
      }
    }

    onComplete();
  } catch (error: any) {
    console.error('Error sending message to Gemini:', error);

    // Check for specific error types
    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      onError('Invalid API key. Please check your Gemini API key in settings.', true);
    } else if (error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      onError('API quota exceeded. Please try again later or check your API limits.', true);
    } else if (error?.message?.includes('SAFETY')) {
      onError('Response blocked by safety filters. Try rephrasing your message.', false);
    } else {
      onError(`Error: ${error?.message || 'Unknown error occurred'}`, true);
    }
  }
};

export { currentModel, currentSystemInstruction };
