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

export interface VoiceMessage {
  id: string;
  timestamp: string;
  text: string;
  lang: 'fr' | 'en';
  persona: string;
  audio_file: string;
  pwd?: string;
  listened: boolean;
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
