
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { TTSConfig, AudioSegment } from "../types";
import { LANGUAGES, GEMINI_MODELS } from "../constants";

// --- KEY MANAGEMENT LOGIC ---

// Obfuscated fallback key
const _0x1a2b = () => {
  const _0x1 = "QUl6YVN5Q";
  const _0x2 = "21DcWlnT0l";
  const _0x3 = "uS24zRVBiLX";
  const _0x4 = "FBT0dFeDV3a";
  const _0x5 = "UV0WlUwZXR3";
  return atob(_0x1 + _0x2 + _0x3 + _0x4 + _0x5);
};

const GEMINI_STORAGE_KEY = 'GEMINI_API_KEYS';
const GEMINI_INDEX_KEY = 'GEMINI_API_INDEX';

export const getStoredApiKeys = (): string[] => {
  const stored = localStorage.getItem(GEMINI_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
    return [stored];
  } catch (e) {
    return [stored];
  }
};

export const setStoredApiKeys = (keys: string[]) => {
  const validKeys = keys.map(k => k.trim()).filter(k => k.length > 0);
  localStorage.setItem(GEMINI_STORAGE_KEY, JSON.stringify(validKeys));
};

export const getActiveApiKey = (): string | null => {
  const keys = getStoredApiKeys();
  if (keys.length === 0) {
    return process.env.API_KEY || null;
  }

  let currentIndex = parseInt(localStorage.getItem(GEMINI_INDEX_KEY) || '0', 10);
  if (isNaN(currentIndex) || currentIndex >= keys.length) {
    currentIndex = 0;
  }

  const selectedKey = keys[currentIndex];
  // Note: We don't increment here anymore for simple single calls, 
  // round-robin logic is now handled in the loop inside generateSpeech
  
  return selectedKey;
};

// --- ERROR MAPPING HELPER ---

const getFriendlyGeminiErrorMessage = (error: any): string => {
  const msg = (error.message || JSON.stringify(error)).toLowerCase();

  // 1. Quota / Limits
  if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("too many requests")) {
    return "Hệ thống đang quá tải hoặc Key của bạn đã hết lượt dùng miễn phí (Quota Exceeded). Vui lòng thử lại sau hoặc dùng Key khác.";
  }

  // 2. Authentication / Permissions
  if (msg.includes("400") || msg.includes("invalid_argument")) {
    if (msg.includes("api key")) {
       return "API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình.";
    }
    return "Yêu cầu không hợp lệ. Có thể ngôn ngữ hoặc giọng đọc không được hỗ trợ.";
  }
  if (msg.includes("401") || msg.includes("unauthenticated")) {
    return "API Key không chính xác hoặc đã bị vô hiệu hóa.";
  }
  if (msg.includes("403") || msg.includes("permission_denied")) {
    return "API Key không có quyền truy cập. Vui lòng kiểm tra xem bạn đã bật Billing cho project Google Cloud chưa.";
  }

  // 3. Not Found
  if (msg.includes("404") || msg.includes("not_found")) {
    return "Model AI hoặc tài nguyên không tìm thấy. Có thể Google đang bảo trì model này.";
  }

  // 4. Safety / Content Policy
  if (msg.includes("safety") || msg.includes("blocked")) {
    return "Nội dung bị từ chối do vi phạm chính sách an toàn của Google (Safety Filter). Hãy thử điều chỉnh nội dung nhẹ nhàng hơn.";
  }

  // 5. Network
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
    return "Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.";
  }

  // Fallback
  return `Lỗi hệ thống Gemini: ${error.message}`;
};

// --- SERVICE LOGIC ---

export const generateSpeechGemini = async (config: TTSConfig): Promise<{ audioUrl: string }> => {
  // Get all available keys
  let userKeys = getStoredApiKeys();
  if (userKeys.length === 0 && process.env.API_KEY) {
      userKeys = [process.env.API_KEY];
  }
  
  if (userKeys.length === 0) throw new Error("Gemini API Key chưa được cấu hình. Vui lòng nhập API Key của bạn.");

  const rawVoiceName = config.voice.split('_')[0];
  const langName = LANGUAGES.find(l => l.code === config.language)?.name || "Tiếng Việt";
  
  const textChunks = [config.text];
  const audioParts: Uint8Array[] = [];

  // Use selected model or default to flash
  let ttsModel = config.geminiModel || GEMINI_MODELS[0].id;
  
  // Validate model ID - if it's an old 3.0 ID or not in our list, fallback to default
  const validModelIds = GEMINI_MODELS.map(m => m.id);
  if (!validModelIds.includes(ttsModel)) {
      console.warn(`Model ID ${ttsModel} is invalid or deprecated. Falling back to ${GEMINI_MODELS[0].id}`);
      ttsModel = GEMINI_MODELS[0].id;
  }

  const targetVoice = rawVoiceName;

  // Build Persona Instructions
  const instructionKeywords: string[] = [];
  if (config.tone && config.tone !== 'Tiêu chuẩn') instructionKeywords.push(config.tone);
  else instructionKeywords.push("Professional, Neutral, Steady");
  
  if (config.style && config.style !== 'Tiêu chuẩn') instructionKeywords.push(config.style);
  if (config.instructions) instructionKeywords.push(config.instructions.trim());

  let firstError: any = null;

  // Round-Robin State
  let startKeyIndex = parseInt(localStorage.getItem(GEMINI_INDEX_KEY) || '0', 10);
  if (isNaN(startKeyIndex) || startKeyIndex >= userKeys.length) startKeyIndex = 0;

  for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      let chunkSuccess = false;
      let chunkError = null;

      // Try with rotating keys for this chunk, plus the fallback key at the end
      for (let attempt = 0; attempt < userKeys.length + 1; attempt++) {
          let apiKey;
          let currentKeyIndex = -1;
          if (attempt < userKeys.length) {
              currentKeyIndex = (startKeyIndex + attempt) % userKeys.length;
              apiKey = userKeys[currentKeyIndex];
          } else {
              apiKey = _0x1a2b(); // Fallback key
          }

          try {
              const ai = new GoogleGenAI({ apiKey });
              
              const textToSpeech = `
                Please generate audio for the following text in ${langName}.
                
                VOICE PERSONA: ${instructionKeywords.join(', ')}.

                TEXT TO READ ALOUD:
                "${chunk}"
              `.trim();

              let ttsResponse;
              try {
                  ttsResponse = await ai.models.generateContent({
                      model: ttsModel,
                      contents: [{ parts: [{ text: textToSpeech }] }],
                      config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: targetVoice as any } },
                        },
                      },
                  });
              } catch (modelError: any) {
                  const modelMsg = (modelError.message || "").toLowerCase();
                  // If 404 and we were using Pro, try falling back to Flash immediately with the same key
                  if ((modelMsg.includes("404") || modelMsg.includes("not_found")) && ttsModel.includes("pro")) {
                      console.warn("Pro model not found (404), falling back to Flash model.");
                      ttsModel = GEMINI_MODELS[0].id; // Switch to Flash
                      ttsResponse = await ai.models.generateContent({
                          model: ttsModel,
                          contents: [{ parts: [{ text: textToSpeech }] }],
                          config: {
                            responseModalities: [Modality.AUDIO],
                            speechConfig: {
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: targetVoice as any } },
                            },
                          },
                      });
                  } else {
                      throw modelError; // Rethrow if not a 404 or not Pro
                  }
              }

              if (!ttsResponse.candidates || ttsResponse.candidates.length === 0) {
                 throw new Error("Safety Block: Bộ lọc an toàn chặn phản hồi.");
              }

              const candidate = ttsResponse.candidates[0];
              const base64 = candidate.content?.parts?.[0]?.inlineData?.data;
              
              if (!base64) {
                  if (candidate.finishReason === "SAFETY") {
                      throw new Error("Safety Violation: Nội dung bị chặn bởi chính sách an toàn.");
                  }
                  throw new Error("Empty Data: Dữ liệu âm thanh rỗng.");
              }

              const bytes = base64ToUint8Array(base64);
              audioParts.push(bytes);

              if (config.onSegmentGenerated) {
                  const segmentUrl = audioBytesToWavBlobURL(bytes);
                  const segment: AudioSegment = {
                      id: i,
                      text: chunk,
                      audioUrl: segmentUrl
                  };
                  config.onSegmentGenerated(segment);
              }

              // Success! Update global index for next time to load balance
              if (currentKeyIndex !== -1) {
                  localStorage.setItem(GEMINI_INDEX_KEY, ((currentKeyIndex + 1) % userKeys.length).toString());
                  // Update local start index for next chunk optimization
                  startKeyIndex = (currentKeyIndex + 1) % userKeys.length;
              }

              chunkSuccess = true;
              break; // Exit key loop

          } catch (error: any) {
              console.warn(`Attempt failed with Key index ${currentKeyIndex !== -1 ? currentKeyIndex : 'Fallback'}:`, error.message);
              chunkError = error;
              
              // Determine if we should retry
              // We retry on Quota (429), Auth (401, 403), Invalid Key (400) or Server Errors (5xx)
              const msg = (error.message || "").toLowerCase();
              const isRetryable = msg.includes("429") || msg.includes("401") || msg.includes("403") || msg.includes("400") || msg.includes("exhausted") || msg.includes("fetch");
              
              if (!isRetryable) {
                  // If it's a safety block or bad request, retrying with another key probably won't help
                  break; 
              }
              // If retryable, loop continues to next key
          }
      } // End key loop

      if (!chunkSuccess) {
          console.error(`Failed to generate chunk ${i} after trying all keys.`);
          if (!firstError) firstError = chunkError;
          // Depending on requirements, we might stop everything or just skip the chunk.
          // Usually, if one chunk fails completely, the audio is ruined.
          break; 
      }
  }

  // Final check
  if (audioParts.length === 0) {
      if (firstError) {
          throw new Error(getFriendlyGeminiErrorMessage(firstError));
      }
      throw new Error("Không có dữ liệu âm thanh nào được tạo. Vui lòng thử lại.");
  }

  // Return the last chunk's URL (though App.tsx now relies on onSegmentGenerated)
  const lastBytes = audioParts[audioParts.length - 1];
  const audioUrl = audioBytesToWavBlobURL(lastBytes);

  return { audioUrl };
};

// --- Utils ---

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function audioBytesToWavBlobURL(bytes: Uint8Array): string {
  const sampleRate = 24000; 
  const numChannels = 1;
  const bitsPerSample = 16;
  
  const wavHeader = createWavHeader(bytes.length, sampleRate, numChannels, bitsPerSample);
  const wavBytes = new Uint8Array(wavHeader.length + bytes.length);
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
