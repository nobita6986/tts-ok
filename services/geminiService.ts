
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { TTSConfig, AudioSegment } from "../types";
import { LANGUAGES, GEMINI_MODELS } from "../constants";

// --- KEY MANAGEMENT LOGIC ---

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

// --- UTILS: Text Splitting ---

const DEFAULT_CHUNK_LENGTH = 1500; 

export const splitTextIntoChunks = (text: string, maxLength: number = DEFAULT_CHUNK_LENGTH): string[] => {
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  const normalizedText = text.replace(/\r\n/g, '\n');
  const paragraphs = normalizedText.split(/\n\s*\n/);
  
  let currentChunk = "";
  const chapterRegex = /^(Chương|Phần|Hồi|Chapter|Part)\s+(\d+|[IVX]+|One|Two|Three)/i;

  for (let i = 0; i < paragraphs.length; i++) {
    let para = paragraphs[i].trim();
    if (!para) continue;

    if (currentChunk.length > 0 && chapterRegex.test(para)) {
        chunks.push(currentChunk);
        currentChunk = "";
    }

    if (currentChunk.length + para.length + 2 <= maxLength) {
        currentChunk += (currentChunk ? "\n\n" : "") + para;
    } else {
        if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = "";
        }

        if (para.length <= maxLength) {
            currentChunk = para;
        } else {
            const sentences = para.match(/[^.!?]+[.!?]+[\])'"]*|.+/g) || [para];
            for (let sentence of sentences) {
                sentence = sentence.trim();
                if (!sentence) continue;
                if (currentChunk.length + sentence.length + 1 <= maxLength) {
                    currentChunk += (currentChunk ? " " : "") + sentence;
                } else {
                    if (currentChunk) chunks.push(currentChunk);
                    if (sentence.length > maxLength) {
                        let temp = sentence;
                        while (temp.length > 0) {
                            let cutLimit = Math.min(temp.length, maxLength);
                            let cutIndex = temp.lastIndexOf(' ', cutLimit);
                            if (cutIndex === -1 || cutIndex < cutLimit * 0.8) cutIndex = cutLimit; 
                            chunks.push(temp.slice(0, cutIndex));
                            temp = temp.slice(cutIndex).trim();
                        }
                        currentChunk = ""; 
                    } else {
                        currentChunk = sentence;
                    }
                }
            }
        }
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
};

// --- SERVICE LOGIC ---

export const generateSpeechGemini = async (config: TTSConfig): Promise<{ audioUrl: string }> => {
  // Get all available keys
  let keys = getStoredApiKeys();
  if (keys.length === 0 && process.env.API_KEY) {
      keys = [process.env.API_KEY];
  }
  
  if (keys.length === 0) throw new Error("Gemini API Key chưa được cấu hình.");

  const rawVoiceName = config.voice.split('_')[0];
  const langName = LANGUAGES.find(l => l.code === config.language)?.name || "Tiếng Việt";
  
  const textChunks = splitTextIntoChunks(config.text);
  const audioParts: Uint8Array[] = [];

  // Use selected model or default to flash
  const ttsModel = config.geminiModel || GEMINI_MODELS[0].id;
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
  if (isNaN(startKeyIndex) || startKeyIndex >= keys.length) startKeyIndex = 0;

  for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      let chunkSuccess = false;
      let chunkError = null;

      // --- CONTEXT PREPARATION ---
      // Provide ~300 chars of context before and after
      const prevContext = i > 0 ? textChunks[i - 1].slice(-300).trim() : "";
      const nextContext = i < textChunks.length - 1 ? textChunks[i + 1].slice(0, 300).trim() : "";

      // Try with rotating keys for this chunk
      for (let attempt = 0; attempt < keys.length; attempt++) {
          const currentKeyIndex = (startKeyIndex + attempt) % keys.length;
          const apiKey = keys[currentKeyIndex];

          try {
              const ai = new GoogleGenAI({ apiKey });
              
              // More robust prompt engineering for context
              const textToSpeech = `
                Please generate audio for the following text in ${langName}.
                
                VOICE PERSONA: ${instructionKeywords.join(', ')}.

                CONTEXT (Use this for intonation flow, but DO NOT READ IT ALOUD):
                - Previous Text: "...${prevContext}"
                - Following Text: "${nextContext}..."

                TEXT TO READ ALOUD (Read ONLY this content):
                "${chunk}"
              `.trim();

              const ttsResponse = await ai.models.generateContent({
                  model: ttsModel,
                  contents: [{ parts: [{ text: textToSpeech }] }],
                  config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: targetVoice as any } },
                    },
                  },
              });

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
              localStorage.setItem(GEMINI_INDEX_KEY, ((currentKeyIndex + 1) % keys.length).toString());
              
              // Update local start index for next chunk optimization
              startKeyIndex = (currentKeyIndex + 1) % keys.length;

              chunkSuccess = true;
              break; // Exit key loop

          } catch (error: any) {
              console.warn(`Attempt failed with Key index ${currentKeyIndex}:`, error.message);
              chunkError = error;
              
              // Determine if we should retry
              // We retry on Quota (429), Auth (401), or Server Errors (5xx)
              const msg = (error.message || "").toLowerCase();
              const isRetryable = msg.includes("429") || msg.includes("401") || msg.includes("exhausted") || msg.includes("fetch");
              
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

  // Merge Audio
  const totalLength = audioParts.reduce((acc, curr) => acc + curr.length, 0);
  const mergedAudio = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of audioParts) {
    mergedAudio.set(part, offset);
    offset += part.length;
  }

  const audioUrl = audioBytesToWavBlobURL(mergedAudio);

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
