import { Message, Sender } from '../types';

const GEMINI_API_KEY_STORAGE_KEY = 'gemini_api_key';

// For now, we'll use a placeholder - user needs to provide their own API key
let apiKey: string | null = null;
let chatSession: any = null;
let currentModel: string = 'gemini-2.0-flash-exp';
let currentSystemInstruction: string = '';

export const getApiKeyStatus = (): { configured: boolean; message: string } => {
  apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);

  if (!apiKey || apiKey.trim() === '') {
    return {
      configured: false,
      message: 'Gemini API key is not configured.'
    };
  }

  return {
    configured: true,
    message: 'Gemini API key is configured.'
  };
};

export const setApiKey = (key: string): void => {
  apiKey = key;
  localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
};

export const getApiKey = (): string | null => {
  if (!apiKey) {
    apiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
  }
  return apiKey;
};

export const reinitializeChatWithHistory = (
  modelId: string,
  systemInstruction: string,
  historyMessages: Message[]
): void => {
  currentModel = modelId;
  currentSystemInstruction = systemInstruction;

  // Note: For demo purposes, we're creating a mock chat session
  // In production, you'd initialize the actual Gemini API here
  chatSession = {
    model: modelId,
    systemInstruction: systemInstruction,
    history: historyMessages.filter(msg => !msg.isError).map(msg => ({
      role: msg.sender === Sender.User ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }))
  };

  console.log('Chat session reinitialized with history:', chatSession);
};

export const resetChatSession = (systemInstruction: string): void => {
  currentSystemInstruction = systemInstruction;
  chatSession = {
    model: currentModel,
    systemInstruction: systemInstruction,
    history: []
  };
  console.log('Chat session reset');
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
    // For demo purposes, we'll simulate streaming with mock responses
    // In production, you'd use the actual Gemini API streaming
    const mockResponse = generateMockResponse(userText, currentSystemInstruction, imageData, audioData);

    // Simulate streaming by chunking the response
    const words = mockResponse.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      onChunk((i > 0 ? ' ' : '') + words[i]);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    onComplete();
  } catch (error) {
    console.error('Error sending message to Gemini:', error);
    onError(`Error communicating with AI: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
  }
};

function generateMockResponse(
  userText: string,
  systemInstruction: string,
  imageData?: { base64ImageData: string; imageMimeType: string },
  audioData?: { base64AudioData: string; audioMimeType: string }
): string {
  // Extract persona name from system instruction
  const personaMatch = systemInstruction.match(/You are (\w+)/);
  const personaName = personaMatch ? personaMatch[1] : 'AI';

  let response = `Thank you for your message: "${userText}"\n\n`;

  if (imageData) {
    response += `I can see you've shared an image. Once the full Gemini API is integrated, I'll be able to analyze it in detail.\n\n`;
  }

  if (audioData) {
    response += `I received your audio message. With full integration, I'll be able to transcribe and respond to it.\n\n`;
  }

  response += `As ${personaName}, I'm here to assist you. This is currently a demonstration response. `;
  response += `Once fully integrated with the Gemini API, I'll provide context-aware responses based on my specialized role and the system instructions configured for me.\n\n`;
  response += `**Current System Instructions Summary**: ${systemInstruction.substring(0, 150)}...`;

  return response;
}

export { currentModel, currentSystemInstruction };
