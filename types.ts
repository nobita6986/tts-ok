
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
  isPreview?: boolean; 
  elevenLabsModel?: string; 
  // Callback for streaming segments
  onSegmentGenerated?: (segment: AudioSegment) => void;
}

export interface AudioSegment {
  id: number;
  text: string;
  audioUrl: string;
  duration?: number;
}

export interface GeneratedAudio {
  fullAudioUrl?: string; // Optional because it might not be ready yet
  segments: AudioSegment[];
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
  elevenLabsModel?: string; 
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
