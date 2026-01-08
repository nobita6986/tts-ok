
import { TTSConfig } from "../types";
import { generateImagePromptCommon, getActiveApiKey as getGeminiActiveKey } from "./geminiService";

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

export const generateSpeechElevenLabs = async (config: TTSConfig): Promise<{ audioUrl: string, imagePrompt: string }> => {
  const apiKey = getActiveElevenLabsKey();
  
  if (!apiKey) {
    throw new Error("ElevenLabs API Key chưa được cấu hình. Vui lòng nhập Key trong phần Cài đặt.");
  }

  try {
    // Determine Model ID: Use config provided ID or fallback to Multilingual v2
    const modelId = config.elevenLabsModel || "eleven_multilingual_v2";

    // Parallel: Call ElevenLabs TTS and Gemini Image Prompt
    const ttsPromise = fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: config.text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: config.style !== 'Tiêu chuẩn' ? 0.5 : 0.0, // Basic style mapping
        }
      })
    });

    // We still use Gemini for Image Prompting even when using ElevenLabs voice
    // But skip it if this is just a preview
    const geminiKey = getGeminiActiveKey();
    const imagePromptPromise = (geminiKey && !config.isPreview)
      ? generateImagePromptCommon(config.text, geminiKey) 
      : Promise.resolve("Preview mode or No Gemini Key - No Image Prompt");

    const [ttsResponse, imagePrompt] = await Promise.all([ttsPromise, imagePromptPromise]);

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.json();
      throw new Error(errorData.detail?.message || "Lỗi khi gọi ElevenLabs API");
    }

    const audioBlob = await ttsResponse.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      audioUrl,
      imagePrompt
    };

  } catch (error: any) {
    console.error("ElevenLabs Error:", error);
    throw new Error(error.message || "Không thể tạo giọng nói qua ElevenLabs.");
  }
};
