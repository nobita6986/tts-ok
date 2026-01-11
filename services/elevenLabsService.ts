
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

// --- FRIENDLY ERROR HELPER ---

const getFriendlyElevenLabsError = (status: number, errorData: any): string => {
  const detail = errorData?.detail;
  const rawMessage = (typeof detail === 'string' ? detail : detail?.message || JSON.stringify(errorData)).toLowerCase();
  
  // 1. Authorization
  if (status === 401 || rawMessage.includes("invalid_api_key")) {
      return "ElevenLabs API Key không chính xác. Vui lòng kiểm tra lại cấu hình.";
  }

  // 2. Quota / Billing
  if (status === 402 || rawMessage.includes("quota_exceeded") || rawMessage.includes("bill")) {
      return "Bạn đã dùng hết số ký tự miễn phí của gói hiện tại (Quota Exceeded). Hãy nâng cấp gói hoặc dùng Key khác.";
  }

  // 3. Rate Limit / Concurrency
  if (status === 429 || rawMessage.includes("too_many_requests") || rawMessage.includes("concurrency")) {
      return "Hệ thống đang bận (Quá nhiều yêu cầu cùng lúc). Vui lòng chờ vài giây rồi thử lại.";
  }

  // 4. Resources Not Found
  if (status === 404 || rawMessage.includes("voice_not_found")) {
      return "ID giọng đọc không tồn tại. Vui lòng kiểm tra lại Voice ID.";
  }

  // 5. Validation
  if (status === 400) {
      if (rawMessage.includes("text")) return "Văn bản đầu vào không hợp lệ hoặc quá dài.";
      if (rawMessage.includes("files")) return "File âm thanh không hợp lệ hoặc quá ngắn/dài.";
      return "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại cấu hình giọng đọc.";
  }

  // 6. Network / Server
  if (status >= 500) {
      return "Lỗi máy chủ ElevenLabs. Dịch vụ đang bảo trì, vui lòng thử lại sau.";
  }

  return `Lỗi ElevenLabs: ${rawMessage}`;
};

export const createVoiceElevenLabs = async (name: string, files: File[], apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("Yêu cầu API Key để tạo giọng clone.");
    if (files.length === 0) throw new Error("Vui lòng tải lên ít nhất 1 file âm thanh.");

    const formData = new FormData();
    formData.append('name', name);
    files.forEach(file => {
        formData.append('files', file);
    });
    formData.append('description', 'Cloned via Web App');
    // Labels seem optional usually, but helpful
    // formData.append('labels', JSON.stringify({ "accent": "American" })); 

    try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                // Do NOT set Content-Type here, fetch sets it with boundary for FormData
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(getFriendlyElevenLabsError(response.status, errorData));
        }

        const data = await response.json();
        return data.voice_id; // Return the new voice ID
    } catch (error: any) {
        console.error("Clone Voice Error:", error);
        throw new Error(error.message || "Không thể tạo giọng clone. Vui lòng kiểm tra lại.");
    }
};

export const generateSpeechElevenLabs = async (config: TTSConfig): Promise<{ audioUrl: string }> => {
  const apiKey = getActiveElevenLabsKey();
  
  if (!apiKey) {
    throw new Error("ElevenLabs API Key chưa được cấu hình. Vui lòng nhập Key trong phần Cài đặt.");
  }

  try {
    const modelId = config.elevenLabsModel || "eleven_multilingual_v2";
    // Set explicit limit of 5000 for ElevenLabs to stay within typical safe limits
    const textChunks = splitTextIntoChunks(config.text, 5000);
    const audioBlobs: Blob[] = [];

    // Process chunks sequentially
    for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        
        // --- CONTEXTUAL LINKING ---
        // We pass previous and next text to help ElevenLabs maintain prosody (flow/intonation)
        // taking the last ~500 chars of prev chunk and first ~500 chars of next chunk.
        
        const previousText = i > 0 
            ? textChunks[i - 1].slice(-500).trim() 
            : undefined;
            
        const nextText = i < textChunks.length - 1 
            ? textChunks[i + 1].slice(0, 500).trim() 
            : undefined;

        // Build Request Body
        const requestBody: any = {
            text: chunk,
            model_id: modelId,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: config.style !== 'Tiêu chuẩn' ? 0.5 : 0.0, 
            }
        };

        // Inject context if available
        if (previousText) requestBody.previous_text = previousText;
        if (nextText) requestBody.next_text = nextText;

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voice}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(getFriendlyElevenLabsError(response.status, errorData));
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
    // If it's already a friendly error message, just rethrow it
    if (error.message.includes("Lỗi") || error.message.includes("API Key") || error.message.includes("Quota")) {
        throw error;
    }
    throw new Error(error.message || "Không thể tạo giọng nói qua ElevenLabs.");
  }
};
