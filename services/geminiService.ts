
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { TTSConfig } from "../types";
import { LANGUAGES } from "../constants";

// --- KEY MANAGEMENT LOGIC ---

const GEMINI_STORAGE_KEY = 'GEMINI_API_KEYS';
const GEMINI_INDEX_KEY = 'GEMINI_API_INDEX';

export const getStoredApiKeys = (): string[] => {
  const stored = localStorage.getItem(GEMINI_STORAGE_KEY);
  if (!stored) return [];
  try {
    // Support legacy single string format or new JSON array format
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
    return [stored]; // Handle legacy plain string (though JSON.parse might fail if simple string, handled in catch)
  } catch (e) {
    // If it's a plain string (legacy), return as single item array
    return [stored];
  }
};

export const setStoredApiKeys = (keys: string[]) => {
  // Filter empty strings
  const validKeys = keys.map(k => k.trim()).filter(k => k.length > 0);
  localStorage.setItem(GEMINI_STORAGE_KEY, JSON.stringify(validKeys));
};

export const getActiveApiKey = (): string | null => {
  const keys = getStoredApiKeys();
  
  // Also consider env key if no user keys, or mix it? 
  // Priority: User Keys > Env Key.
  if (keys.length === 0) {
    return process.env.API_KEY || null;
  }

  // Round-Robin Logic
  let currentIndex = parseInt(localStorage.getItem(GEMINI_INDEX_KEY) || '0', 10);
  if (isNaN(currentIndex) || currentIndex >= keys.length) {
    currentIndex = 0;
  }

  const selectedKey = keys[currentIndex];

  // Increment and save index for next time
  const nextIndex = (currentIndex + 1) % keys.length;
  localStorage.setItem(GEMINI_INDEX_KEY, nextIndex.toString());

  return selectedKey;
};

// --- SERVICE LOGIC ---

const getClient = () => {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    throw new Error("Gemini API Key chưa được cấu hình.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to generate image prompt (Common for both services logic)
// UPDATED: Use Gemini 3 Flash Preview for faster text generation
export const generateImagePromptCommon = async (text: string, apiKey: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const promptModel = "gemini-3-flash-preview"; 
      const promptResponse = await ai.models.generateContent({
        model: promptModel,
        contents: `Create a highly detailed, artistic, and photorealistic image generation prompt (in English) based on the following text. The prompt should describe the scene, mood, lighting, and subjects suitable for a YouTube thumbnail or cinematic background matching the content: "${text}". Only return the prompt text.`,
      });
      return promptResponse.text || "Không thể tạo prompt ảnh.";
    } catch (e) {
      console.warn("Lỗi tạo prompt ảnh:", e);
      return "Không thể tạo prompt ảnh.";
    }
};

export const generateSpeechGemini = async (config: TTSConfig): Promise<{ audioUrl: string, imagePrompt: string }> => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error("Gemini API Key chưa được cấu hình.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  // Clean the voice ID for Gemini (remove _US, _JP suffixes)
  const rawVoiceName = config.voice.split('_')[0];

  // Logic Prompt ngôn ngữ
  const langName = LANGUAGES.find(l => l.code === config.language)?.name || "Tiếng Việt";
  
  // --- Voice Cloning Mode (Gemini) ---
  if (config.isClone && config.audioSample) {
    try {
      // Step 1: Analyze Voice
      // UPDATED: Use Gemini 3 Pro Preview for complex analysis tasks
      const analysisModel = "gemini-3-pro-preview"; 
      const rawVoicesList = ["Aoede", "Charon", "Fenrir", "Kore", "Puck", "Zephyr"];
      
      const analysisPrompt = `
        Analyze the audio sample.
        1. Select the closest matching voice from this list based on gender and timber: ${rawVoicesList.join(', ')}.
        2. Describe the speaking style (e.g., speed, pitch, emotion) in 5 words or less.
      `;

      const analysisResponse = await ai.models.generateContent({
        model: analysisModel,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: config.audioMimeType || 'audio/wav',
                data: config.audioSample
              }
            },
            { text: analysisPrompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              closestVoice: { type: Type.STRING, enum: rawVoicesList },
              styleDescription: { type: Type.STRING }
            },
            required: ["closestVoice", "styleDescription"]
          }
        }
      });

      let closestVoice = "Puck";
      let styleDescription = "neutral";
      
      const jsonText = analysisResponse.text;
      if (jsonText) {
          try {
            const data = JSON.parse(jsonText);
            closestVoice = data.closestVoice;
            styleDescription = data.styleDescription;
          } catch (e) {
            console.warn("Không thể phân tích JSON, sử dụng mặc định.");
          }
      }

      // Step 2: Synthesize
      // NOTE: Gemini 3 TTS is not widely available in public docs as a separate model ID yet, 
      // sticking to the stable preview TTS model for actual audio generation.
      const ttsModel = "gemini-2.5-flash-preview-tts";
      
      const userInstructions: string[] = [];
      userInstructions.push(`Language: ${langName}`); // Enforce language
      if (styleDescription) userInstructions.push(styleDescription);
      if (config.tone && config.tone !== 'Tiêu chuẩn') userInstructions.push(config.tone);
      if (config.style && config.style !== 'Tiêu chuẩn') userInstructions.push(config.style);
      if (config.instructions) userInstructions.push(config.instructions);
      
      const textPrompt = `Say in ${langName} with ${userInstructions.join(', ')}: "${config.text}"`;

      // Parallel execution: If preview, skip image prompt
      const ttsPromise = ai.models.generateContent({
          model: ttsModel,
          contents: [{ parts: [{ text: textPrompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: closestVoice as any },
              },
            },
          },
      });

      const imagePromptPromise = config.isPreview 
        ? Promise.resolve("Preview mode - No image") 
        : generateImagePromptCommon(config.text, apiKey);

      const [ttsResponse, imagePrompt] = await Promise.all([ttsPromise, imagePromptPromise]);

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Không có âm thanh trả về.");
      
      return {
        audioUrl: base64ToWavBlobURL(base64Audio),
        imagePrompt
      };

    } catch (error: any) {
      console.error("Lỗi clone Gemini:", error);
      throw new Error(error.message || "Lỗi khi clone giọng.");
    }
  }

  // --- Standard Mode (Gemini) ---
  const model = "gemini-2.5-flash-preview-tts";

  const instructions: string[] = [];
  instructions.push(`Language: ${langName}`);
  if (config.tone && config.tone !== 'Tiêu chuẩn') instructions.push(`${config.tone} tone`);
  if (config.style && config.style !== 'Tiêu chuẩn') instructions.push(`${config.style} style`);
  if (config.instructions) instructions.push(config.instructions.trim());

  // Explicitly prompt for the language
  const textToSpeech = `Say in ${langName} with ${instructions.join(', ')}: ${config.text}`;

  try {
    const ttsPromise = ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: textToSpeech }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: rawVoiceName as any },
            },
          },
        },
    });

    const imagePromptPromise = config.isPreview 
      ? Promise.resolve("Preview mode - No image") 
      : generateImagePromptCommon(config.text, apiKey);

    const [response, imagePrompt] = await Promise.all([ttsPromise, imagePromptPromise]);

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Không có dữ liệu âm thanh.");

    return {
      audioUrl: base64ToWavBlobURL(base64Audio),
      imagePrompt
    };
  } catch (error: any) {
    console.error("Lỗi Gemini TTS:", error);
    throw new Error(error.message || "Không thể tạo giọng nói Gemini.");
  }
};

// --- Utils ---
function base64ToWavBlobURL(base64: string): string {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const wavHeader = createWavHeader(len, 24000, 1, 16);
  const wavBytes = new Uint8Array(wavHeader.length + len);
  wavBytes.set(wavHeader, 0);
  wavBytes.set(bytes, wavHeader.length);
  const blob = new Blob([wavBytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

function createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); 
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  return new Uint8Array(header);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
