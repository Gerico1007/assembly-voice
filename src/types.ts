export interface Persona {
  id: string;
  name: string;
  glyph: string;
  avatarPath: string;
  color: string;
  description: string;
  systemInstruction: string;
  role?: string;
  specialties?: string[];
  voiceCharacteristics?: {
    tone: string;
    tempo: string;
    language: string;
  };
}

export enum Sender {
  User = 'user',
  AI = 'ai',
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
  avatar: string;
  name: string;
  aiBubbleClassName?: string;
  isError?: boolean;
  imagePreviewUrl?: string;
  base64ImageData?: string;
  imageMimeType?: string;
  fileName?: string;
  audioDataUrl?: string;
  audioMimeType?: string;
}

export interface AppSettings {
  activePersonaId: string;
  selectedModel: string;
  customPersonaInstructions?: { [id: string]: string };
  autoPlayTTS: boolean;
  currentCloudSessionId?: string;
}

export enum ToastType {
  Success = 'success',
  Error = 'error',
  Info = 'info',
  Warning = 'warning',
}

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}
