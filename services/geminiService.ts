
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { TTSConfig, AudioSegment } from "../types";
import { LANGUAGES } from "../constants";

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
  const nextIndex = (currentIndex + 1) % keys.length;
  localStorage.setItem(GEMINI_INDEX_KEY, nextIndex.toString());

  return selectedKey;
};

// --- UTILS: Text Splitting ---

// Updated Limit: ~4000 Vietnamese words.
// Avg Vietnamese word length + space is approx 5 chars.
// 4000 words * 5 chars = 20,000 characters.
// This is well within Gemini's 8192 token limit (which is roughly 30k+ chars for English, slightly less for complex scripts).
const DEFAULT_CHUNK_LENGTH = 20000; 

export const splitTextIntoChunks = (text: string, maxLength: number = DEFAULT_CHUNK_LENGTH): string[] => {
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  
  // Normalize newlines to avoid platform specific issues
  const normalizedText = text.replace(/\r\n/g, '\n');
  
  // Split by double newlines to get paragraphs (Preserve paragraph structure)
  const paragraphs = normalizedText.split(/\n\s*\n/);
  
  let currentChunk = "";

  // Regex to detect Chapter/Part headers to force a logical split
  // Matches: "Chương 1", "Phần II", "Chapter 5", "Part One", "Hồi 3" at start of paragraph
  const chapterRegex = /^(Chương|Phần|Hồi|Chapter|Part)\s+(\d+|[IVX]+|One|Two|Three)/i;

  for (let i = 0; i < paragraphs.length; i++) {
    let para = paragraphs[i].trim();
    if (!para) continue;

    // Logic 1: Priority Split by Chapter/Section
    // If we hit a new chapter header and we have accumulated audio, push current buffer now
    // to keep the new chapter start fresh at the beginning of a file.
    if (currentChunk.length > 0 && chapterRegex.test(para)) {
        chunks.push(currentChunk);
        currentChunk = "";
    }

    // Logic 2: Accumulate Paragraphs
    // Check if adding this paragraph exceeds the limit
    // +2 accounts for the double newline we might add
    if (currentChunk.length + para.length + 2 <= maxLength) {
        currentChunk += (currentChunk ? "\n\n" : "") + para;
    } else {
        // Adding this paragraph would exceed limit. 
        
        // 1. Push the current chunk if it exists.
        if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = "";
        }

        // 2. Handle the current paragraph
        if (para.length <= maxLength) {
            // If paragraph fits in a new chunk by itself, set it
            currentChunk = para;
        } else {
            // Logic 3: Split Massive Paragraphs (Sentence Level)
            // Paragraph is larger than maxLength. We must split it by sentences.
            
            // Regex to match sentences: ends with . ! ? followed by space or end of string.
            const sentences = para.match(/[^.!?]+[.!?]+[\])'"]*|.+/g) || [para];
            
            for (let sentence of sentences) {
                sentence = sentence.trim();
                if (!sentence) continue;

                if (currentChunk.length + sentence.length + 1 <= maxLength) {
                    currentChunk += (currentChunk ? " " : "") + sentence;
                } else {
                    if (currentChunk) chunks.push(currentChunk);
                    
                    // Logic 4: Hard Split (Word Level fallback)
                    // If a single sentence is still larger than limit (very rare)
                    if (sentence.length > maxLength) {
                        let temp = sentence;
                        while (temp.length > 0) {
                            let cutLimit = Math.min(temp.length, maxLength);
                            // Try to cut at a space near the limit
                            let cutIndex = temp.lastIndexOf(' ', cutLimit);
                            
                            // If no space found in the last 20% of the chunk, hard cut
                            if (cutIndex === -1 || cutIndex < cutLimit * 0.8) {
                                cutIndex = cutLimit; 
                            }

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
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error("Gemini API Key chưa được cấu hình.");
  
  const ai = new GoogleGenAI({ apiKey });
  const rawVoiceName = config.voice.split('_')[0];
  const langName = LANGUAGES.find(l => l.code === config.language)?.name || "Tiếng Việt";
  
  // Use default limit (20000 chars ~ 4000 words) for Gemini
  const textChunks = splitTextIntoChunks(config.text);
  const audioParts: Uint8Array[] = [];

  // --- TTS Generation Loop ---
  const ttsModel = "gemini-2.5-flash-preview-tts";
  const instructions: string[] = [];
  instructions.push(`Language: ${langName}`);

  // Standard params
  if (config.tone && config.tone !== 'Tiêu chuẩn') instructions.push(`${config.tone} tone`);
  if (config.style && config.style !== 'Tiêu chuẩn') instructions.push(`${config.style} style`);
  
  if (config.instructions) instructions.push(config.instructions.trim());

  // Use rawVoiceName directly
  const targetVoice = rawVoiceName;

  for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      try {
          const textToSpeech = `Say in ${langName} with ${instructions.join(', ')}: ${chunk}`;
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
          const base64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          
          if (base64) {
              const bytes = base64ToUint8Array(base64);
              audioParts.push(bytes);

              // *** STREAMING: Emit segment immediately ***
              if (config.onSegmentGenerated) {
                  const segmentUrl = audioBytesToWavBlobURL(bytes);
                  const segment: AudioSegment = {
                      id: i,
                      text: chunk,
                      audioUrl: segmentUrl
                  };
                  config.onSegmentGenerated(segment);
              }
          }
      } catch (error: any) {
          console.error(`Lỗi tạo chunk ${i}:`, error);
          // Continue to next chunk even if one fails
      }
  }

  // Final Output Construction
  if (audioParts.length === 0) throw new Error("Không có dữ liệu âm thanh nào được tạo.");

  // Merge Audio
  const totalLength = audioParts.reduce((acc, curr) => acc + curr.length, 0);
  const mergedAudio = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of audioParts) {
    mergedAudio.set(part, offset);
    offset += part.length;
  }

  // Create WAV Blob
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
  // Gemini returns PCM data (typically 24kHz, 1 channel, 16 bit based on SDK docs/behavior)
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
