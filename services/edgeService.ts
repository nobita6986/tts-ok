import { TTSConfig, AudioSegment, GeneratedAudio } from '../types';

export const generateSpeechEdge = async (config: TTSConfig): Promise<{ audioUrl: string }> => {
  try {
    const response = await fetch('/api/tts/edge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: config.text,
        voice: config.voice,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Edge TTS failed with status ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Edge TTS doesn't provide segment-level callbacks in this simple implementation,
    // so we just return one large segment.
    const segment: AudioSegment = {
      id: 0,
      text: config.text,
      audioUrl: audioUrl,
    };

    if (config.onSegmentGenerated) {
      config.onSegmentGenerated(segment);
    }

    return {
      audioUrl: audioUrl,
    };
  } catch (error) {
    console.error("Edge TTS Generation Error:", error);
    throw error;
  }
};
