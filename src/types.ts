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

/**
 * How answerable a message is. Decided by the SERVER at publish time, never
 * claimed by the publisher, so a listener can tell BEFORE tapping whether there
 * is anywhere to go.
 */
export type VoiceReach =
  | 'steerable'
  | 'other-host'
  | 'other-user'
  | 'not-multiplexed'
  | 'unknown';

/**
 * The return address a voice carries: who published it, and where that
 * publisher can be reached so a listener can answer.
 *
 * `attested` is the load-bearing word. "self-declared" means the publisher said
 * so; "server" would mean an inventory was read and the address found in it.
 * Today nothing sets "server", and the card must never imply otherwise.
 */
export interface VoiceOrigin {
  schemaVersion?: number;
  user?: string;
  host?: string;
  cwd?: string;
  target: {
    multiplexer: 'tmux' | 'herdr' | 'none';
    session?: string;
    window?: string;
    pane?: string;
    workspace?: string;
    tab?: string;
    label?: string;
  };
  muxUser?: string;
  serverHost?: string;
  serverUser?: string;
  reach: VoiceReach;
  attested: 'self-declared' | 'server';
  observedAt?: string;
}

export interface VoiceMessage {
  id: string;
  timestamp: string;
  text: string;
  lang: 'fr' | 'en';
  persona: string;
  audio_file: string;
  /** Legacy. Present on all 407 records published before origin existed. */
  pwd?: string;
  listened: boolean;
  /** Absent on every record published before 2026-08-08. Absence is a state. */
  origin?: VoiceOrigin;
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
