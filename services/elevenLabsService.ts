
import { TTSConfig, AudioSegment } from "../types";
import { splitTextIntoChunks } from "./geminiService";

const EL_STORAGE_KEY = 'ELEVENLABS_API_KEYS';
const EL_INDEX_KEY = 'ELEVENLABS_API_INDEX';

export const getStoredElevenLabsKeys = (): string[] => {
  const stored = localStorage.getItem(EL_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
    return [stored]; 
  } catch (e) {
    return [stored];
  }
};

export const setStoredElevenLabsKeys = (keys: string[]) => {
  const validKeys = keys.map(k => k.trim()).filter(k => k.length > 0);
  localStorage.setItem(EL_STORAGE_KEY, JSON.stringify(validKeys));
};

export const getActiveElevenLabsKey = (): string | null => {
  const keys = getStoredElevenLabsKeys();
  if (keys.length === 0) return null;

  let currentIndex = parseInt(localStorage.getItem(EL_INDEX_KEY) || '0', 10);
  if (isNaN(currentIndex) || currentIndex >= keys.length) {
    currentIndex = 0;
  }

  const selectedKey = keys[currentIndex];

  const nextIndex = (currentIndex + 1) % keys.length;
  localStorage.setItem(EL_INDEX_KEY, nextIndex.toString());

  return selectedKey;
};

export const generateSpeechElevenLabs = async (config: TTSConfig): Promise<{ audioUrl: string }> => {
  const apiKey = getActiveElevenLabsKey();
  
  if (!apiKey) {
    throw new Error("ElevenLabs API Key chưa được cấu hình. Vui lòng nhập Key trong phần Cài đặt.");
  }

  try {
    const modelId = config.elevenLabsModel || "eleven_multilingual_v2";
    // Set explicit limit of 5000 for ElevenLabs
    const textChunks = splitTextIntoChunks(config.text, 5000);
    const audioBlobs: Blob[] = [];

    // Process chunks sequentially
    for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voice}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: chunk,
                model_id: modelId,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: config.style !== 'Tiêu chuẩn' ? 0.5 : 0.0, 
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail?.message || "Lỗi khi gọi ElevenLabs API");
        }

        const blob = await response.blob();
        audioBlobs.push(blob);

        // *** STREAMING: Emit segment immediately ***
        if (config.onSegmentGenerated) {
            const segmentUrl = URL.createObjectURL(blob);
            const segment: AudioSegment = {
                id: i,
                text: chunk,
                audioUrl: segmentUrl
            };
            config.onSegmentGenerated(segment);
        }
    }

    if (audioBlobs.length === 0) throw new Error("Không có âm thanh nào được tạo.");

    // Concatenate MP3 Blobs
    const combinedBlob = new Blob(audioBlobs, { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(combinedBlob);

    return {
      audioUrl
    };

  } catch (error: any) {
    console.error("ElevenLabs Error:", error);
    throw new Error(error.message || "Không thể tạo giọng nói qua ElevenLabs.");
  }
};
