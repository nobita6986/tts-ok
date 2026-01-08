
export type TTSProvider = 'gemini' | 'elevenlabs';

export interface TTSConfig {
  text: string;
  voice: string;
  provider: TTSProvider;
  language: string;
  tone?: string;
  style?: string;
  instructions?: string;
  isClone?: boolean;
  audioSample?: string;
  audioMimeType?: string;
  isPreview?: boolean; // New flag for preview mode
  elevenLabsModel?: string; // New field for ElevenLabs Model ID
}

export interface GeneratedAudio {
  audioUrl: string;
  imagePrompt: string;
  text: string;
  voice: string;
  provider: TTSProvider;
  language: string;
  timestamp: number;
}

export interface SavedScript {
  id: string;
  text: string;
  voice: string;
  provider: TTSProvider;
  language: string;
  tone: string;
  style: string;
  instructions: string;
  timestamp: number;
  elevenLabsModel?: string; // Save the model preference
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
