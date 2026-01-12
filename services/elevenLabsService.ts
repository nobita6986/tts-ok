
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
  // Round-robin index update is handled in the main loop for retry capability
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
      if (rawMessage.includes("text")) return "Văn bản đầu vào không hợp lệ hoặc quá dài (Vui lòng thử chia nhỏ hơn).";
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
    
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(getFriendlyElevenLabsError(response.status, errorData));
        }

        const data = await response.json();
        return data.voice_id; 
    } catch (error: any) {
        console.error("Clone Voice Error:", error);
        throw new Error(error.message || "Không thể tạo giọng clone. Vui lòng kiểm tra lại.");
    }
};

export const generateSpeechElevenLabs = async (config: TTSConfig): Promise<{ audioUrl: string }> => {
  const keys = getStoredElevenLabsKeys();
  
  if (keys.length === 0) {
    throw new Error("ElevenLabs API Key chưa được cấu hình. Vui lòng nhập Key trong phần Cài đặt.");
  }

  try {
    const modelId = config.elevenLabsModel || "eleven_multilingual_v2";
    
    // REDUCED CHUNK SIZE TO 2500 TO PREVENT "TEXT TOO LONG" ERRORS
    const textChunks = splitTextIntoChunks(config.text, 2500);
    const audioBlobs: Blob[] = [];

    // Round-Robin Index Initialization
    let startKeyIndex = parseInt(localStorage.getItem(EL_INDEX_KEY) || '0', 10);
    if (isNaN(startKeyIndex) || startKeyIndex >= keys.length) startKeyIndex = 0;

    // Process chunks sequentially
    for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        
        // Context Logic: Provide up to 500 chars of context for smooth transitions
        const previousText = i > 0 
            ? textChunks[i - 1].slice(-500).trim() 
            : undefined;
            
        const nextText = i < textChunks.length - 1 
            ? textChunks[i + 1].slice(0, 500).trim() 
            : undefined;

        let chunkSuccess = false;
        let lastError = null;

        // --- RETRY LOOP ---
        for (let attempt = 0; attempt < keys.length; attempt++) {
            const currentKeyIndex = (startKeyIndex + attempt) % keys.length;
            const apiKey = keys[currentKeyIndex];

            try {
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

                // Add context only if valid
                if (previousText && previousText.length > 0) requestBody.previous_text = previousText;
                if (nextText && nextText.length > 0) requestBody.next_text = nextText;

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

                // Streaming Callback
                if (config.onSegmentGenerated) {
                    const segmentUrl = URL.createObjectURL(blob);
                    const segment: AudioSegment = {
                        id: i,
                        text: chunk,
                        audioUrl: segmentUrl
                    };
                    config.onSegmentGenerated(segment);
                }

                // Success! Save index for next time
                localStorage.setItem(EL_INDEX_KEY, ((currentKeyIndex + 1) % keys.length).toString());
                startKeyIndex = (currentKeyIndex + 1) % keys.length;

                chunkSuccess = true;
                break; // Exit retry loop

            } catch (err: any) {
                console.warn(`ElevenLabs key index ${currentKeyIndex} failed:`, err.message);
                lastError = err;

                // Check if retry-able
                const msg = err.message.toLowerCase();
                const isRetryable = msg.includes("quota") || msg.includes("bill") || msg.includes("key") || msg.includes("429");

                if (!isRetryable) break; // Don't retry for validation/logic errors
            }
        } // End Retry Loop

        if (!chunkSuccess) {
            if (lastError) throw lastError;
            throw new Error("Không thể tạo giọng nói. Vui lòng kiểm tra lại Key hoặc kết nối mạng.");
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
    if (error.message.includes("Lỗi") || error.message.includes("API Key") || error.message.includes("Quota")) {
        throw error;
    }
    throw new Error(error.message || "Không thể tạo giọng nói qua ElevenLabs.");
  }
};
