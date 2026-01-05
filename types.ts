
export interface TTSConfig {
  text: string;
  voice: string;
  tone?: string;
  style?: string;
  instructions?: string;
  isClone?: boolean;
  audioSample?: string;
  audioMimeType?: string;
}

export interface GeneratedAudio {
  audioUrl: string;
  imagePrompt: string;
  text: string;
  voice: string;
  timestamp: number;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
