
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { TTSConfig } from "../types";
import { VOICES } from "../constants";

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem('GEMINI_API_KEY');
};

export const setStoredApiKey = (key: string) => {
  localStorage.setItem('GEMINI_API_KEY', key);
};

const getClient = () => {
  const apiKey = getStoredApiKey() || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key chưa được cấu hình. Vui lòng vào phần Cài đặt để nhập key.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSpeech = async (config: TTSConfig): Promise<{ audioUrl: string, imagePrompt: string }> => {
  const ai = getClient();
  
  // Clean the voice ID: Remove '_EN' suffix if present to get the raw API voice name (e.g. Aoede_EN -> Aoede)
  const rawVoiceName = config.voice.split('_')[0];

  // Helper function to generate Image Prompt (Parallel Task)
  const generateImagePrompt = async (text: string): Promise<string> => {
    try {
      const promptModel = "gemini-2.5-flash";
      const promptResponse = await ai.models.generateContent({
        model: promptModel,
        contents: `Create a highly detailed, artistic, and photorealistic image generation prompt (in English) based on the following text. The prompt should describe the scene, mood, lighting, and subjects suitable for a YouTube thumbnail or cinematic background matching the content: "${text}". Only return the prompt text.`,
      });
      return promptResponse.text || "Không thể tạo prompt ảnh.";
    } catch (e) {
      console.warn("Lỗi tạo prompt ảnh:", e);
      return "Không thể tạo prompt ảnh do lỗi kết nối.";
    }
  };
  
  // -- Voice Cloning Mode --
  if (config.isClone && config.audioSample) {
    try {
      // Step 1: Analyze Voice
      const analysisModel = "gemini-2.5-flash"; 
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

      // Step 2: Synthesize Speech & Image Prompt (Parallel)
      const ttsModel = "gemini-2.5-flash-preview-tts";
      
      const userInstructions: string[] = [];
      if (styleDescription) userInstructions.push(styleDescription);
      if (config.tone && config.tone !== 'Tiêu chuẩn') userInstructions.push(config.tone);
      if (config.style && config.style !== 'Tiêu chuẩn') userInstructions.push(config.style);
      if (config.instructions) userInstructions.push(config.instructions);
      
      const textPrompt = userInstructions.length > 0 
        ? `Say with ${userInstructions.join(', ')}: "${config.text}"`
        : config.text;

      const [ttsResponse, imagePrompt] = await Promise.all([
        ai.models.generateContent({
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
        }),
        generateImagePrompt(config.text)
      ]);

      const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("Không có âm thanh nào được tạo từ bước tổng hợp bản sao.");
      }
      return {
        audioUrl: base64ToWavBlobURL(base64Audio),
        imagePrompt
      };

    } catch (error: any) {
      console.error("Lỗi sao chép giọng Gemini:", error);
      throw new Error(error.message || "Không thể phân tích và sao chép giọng nói.");
    }
  }

  // -- Standard TTS Mode --
  const model = "gemini-2.5-flash-preview-tts";

  let textToSpeech = config.text;
  const instructions: string[] = [];

  if (config.tone && config.tone !== 'Tiêu chuẩn') {
    instructions.push(`${config.tone} tone`);
  }
  if (config.style && config.style !== 'Tiêu chuẩn') {
    instructions.push(`${config.style} style`);
  }
  if (config.instructions && config.instructions.trim()) {
    instructions.push(config.instructions.trim());
  }

  if (instructions.length > 0) {
    textToSpeech = `Say with ${instructions.join(', ')}: ${config.text}`;
  }

  try {
    // Run TTS and Image Prompt generation in parallel
    const [response, imagePrompt] = await Promise.all([
      ai.models.generateContent({
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
      }),
      generateImagePrompt(config.text)
    ]);

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Không có âm thanh nào được tạo từ mô hình.");
    }

    return {
      audioUrl: base64ToWavBlobURL(base64Audio),
      imagePrompt
    };
  } catch (error: any) {
    console.error("Lỗi tạo giọng nói Gemini:", error);
    throw new Error(error.message || "Không thể tạo giọng nói.");
  }
};

// --- Audio Utilities ---

function base64ToWavBlobURL(base64: string): string {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Gemini returns raw PCM (Int16 usually). We need to wrap it in a WAV container.
  // Standard Gemini TTS is 24kHz Mono 16-bit PCM.
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
  view.setUint16(20, 1, true); // PCM
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
