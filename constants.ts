
export const LANGUAGES = [
  { code: "vi-VN", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en-US", name: "Tiếng Anh (Mỹ)", flag: "🇺🇸" },
  { code: "en-GB", name: "Tiếng Anh (Anh)", flag: "🇬🇧" },
  { code: "ja-JP", name: "Tiếng Nhật", flag: "🇯🇵" },
  { code: "ko-KR", name: "Tiếng Hàn", flag: "🇰🇷" },
];

export const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', icon: 'Sparkles' },
  { id: 'elevenlabs', name: 'ElevenLabs', icon: 'Activity' }
];

export const ELEVENLABS_MODELS = [
  { 
    id: 'eleven_v3', 
    name: 'Eleven v3 (Mới nhất - Biểu cảm cao)', 
    description: 'Model tiên tiến nhất với khả năng biểu cảm cao, hỗ trợ đa ngôn ngữ (~74 ngôn ngữ) và chất lượng tự nhiên nhất.' 
  },
  { 
    id: 'eleven_multilingual_v2', 
    name: 'Multilingual v2 (Chất lượng cao)', 
    description: 'Model TTS đa ngôn ngữ chất lượng cao - phù hợp cho voiceovers, podcast và ứng dụng nội dung đa ngôn ngữ.' 
  },
  { 
    id: 'eleven_flash_v2_5', 
    name: 'Flash v2.5 (Tối ưu tốc độ)', 
    description: 'Model tối ưu tốc độ và độ trễ thấp, hỗ trợ nhiều ngôn ngữ - tốt cho real-time/interactive apps.' 
  },
  { 
    id: 'eleven_flash_v2', 
    name: 'Flash v2 (Cũ)', 
    description: 'Model nhanh, được dùng trước đây - hiện dần được thay thế bởi Flash v2.5.' 
  },
  { 
    id: 'eleven_turbo_v2_5', 
    name: 'Turbo v2.5 (Cân bằng)', 
    description: 'Model cân bằng giữa chất lượng & tốc độ, hỗ trợ nhiều ngôn ngữ.' 
  },
  { 
    id: 'eleven_turbo_v2', 
    name: 'Turbo v2 (Cũ)', 
    description: 'Model trước đây của dòng Turbo - vẫn được hỗ trợ ở một số trường hợp.' 
  }
];

export interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  traits: string;
  provider: string;
  lang: string;
  previewUrl?: string; // Optional URL for audio preview
}

export const VOICES: VoiceOption[] = [
  // --- GEMINI VOICES (VIETNAMESE) ---
  { id: "Aoede", name: "Ngọc Huyền (Aoede)", gender: "Nữ", traits: "Tự tin, Tin tức", provider: "gemini", lang: "vi-VN" },
  { id: "Charon", name: "Minh Quân (Charon)", gender: "Nam", traits: "Trầm ấm, Tài liệu", provider: "gemini", lang: "vi-VN" },
  { id: "Fenrir", name: "Thanh Tùng (Fenrir)", gender: "Nam", traits: "Sôi nổi, Review", provider: "gemini", lang: "vi-VN" },
  { id: "Kore", name: "Diệu Linh (Kore)", gender: "Nữ", traits: "Thư giãn, Kể chuyện", provider: "gemini", lang: "vi-VN" },
  { id: "Puck", name: "Hoàng Bách (Puck)", gender: "Nam", traits: "Tự nhiên, Phóng sự", provider: "gemini", lang: "vi-VN" },
  { id: "Zephyr", name: "Mai Anh (Zephyr)", gender: "Nữ", traits: "Ngọt ngào, Đọc sách", provider: "gemini", lang: "vi-VN" },

  // --- GEMINI (US ENGLISH) ---
  { id: "Aoede_US", name: "Aoede (US)", gender: "Nữ", traits: "Confident, Professional", provider: "gemini", lang: "en-US" },
  { id: "Charon_US", name: "Charon (US)", gender: "Nam", traits: "Deep, Authoritative", provider: "gemini", lang: "en-US" },
  { id: "Fenrir_US", name: "Fenrir (US)", gender: "Nam", traits: "Energetic, Strong", provider: "gemini", lang: "en-US" },
  { id: "Kore_US", name: "Kore (US)", gender: "Nữ", traits: "Calm, Soothing", provider: "gemini", lang: "en-US" },
  { id: "Puck_US", name: "Puck (US)", gender: "Nam", traits: "Natural, Spoken", provider: "gemini", lang: "en-US" },
  { id: "Zephyr_US", name: "Zephyr (US)", gender: "Nữ", traits: "High pitched, Sweet", provider: "gemini", lang: "en-US" },

  // --- GEMINI (UK ENGLISH - Mapped) ---
  { id: "Puck_GB", name: "Arthur (Puck)", gender: "Nam", traits: "British, Formal", provider: "gemini", lang: "en-GB" },
  { id: "Kore_GB", name: "Emma (Kore)", gender: "Nữ", traits: "British, Gentle", provider: "gemini", lang: "en-GB" },
  { id: "Fenrir_GB", name: "Harry (Fenrir)", gender: "Nam", traits: "British, Energetic", provider: "gemini", lang: "en-GB" },

  // --- GEMINI (JAPANESE - Mapped) ---
  { id: "Kore_JP", name: "Sakura (Kore)", gender: "Nữ", traits: "Soft, Anime style", provider: "gemini", lang: "ja-JP" },
  { id: "Charon_JP", name: "Kenji (Charon)", gender: "Nam", traits: "Deep, Samurai", provider: "gemini", lang: "ja-JP" },
  { id: "Zephyr_JP", name: "Hina (Zephyr)", gender: "Nữ", traits: "High pitch, Cute", provider: "gemini", lang: "ja-JP" },

  // --- GEMINI (KOREAN - Mapped) ---
  { id: "Aoede_KR", name: "Ji-woo (Aoede)", gender: "Nữ", traits: "Professional, News", provider: "gemini", lang: "ko-KR" },
  { id: "Puck_KR", name: "Min-ho (Puck)", gender: "Nam", traits: "Casual, Drama", provider: "gemini", lang: "ko-KR" },

  // --- ELEVENLABS VOICES (Updated to 'multi' for better filtering) ---
  
  // -- Popular Male (Multilingual capable) --
  { 
    id: "pNInz6obpgDQGcFmaJgB", 
    name: "Adam", 
    gender: "Nam", 
    traits: "Mỹ, Deep, Narration (Legacy)", 
    provider: "elevenlabs", 
    lang: "multi", // Changed to multi
    previewUrl: "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/adam.mp3"
  },
  { 
    id: "ErXwobaYiN019PkySvjV", 
    name: "Antoni", 
    gender: "Nam", 
    traits: "Mỹ, Cân bằng, Podcast", 
    provider: "elevenlabs", 
    lang: "multi",
    previewUrl: "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/antoni.mp3"
  },
  { 
    id: "IKne3meq5aSn9XLyUdCD", 
    name: "Charlie", 
    gender: "Nam", 
    traits: "Úc, Tự nhiên, Casual", 
    provider: "elevenlabs", 
    lang: "multi",
    previewUrl: "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/charlie.mp3"
  },
  { 
    id: "TxGEqnHWrfWFTfGW9XjX", 
    name: "Josh", 
    gender: "Nam", 
    traits: "Mỹ, Trầm, Kể chuyện", 
    provider: "elevenlabs", 
    lang: "multi",
    previewUrl: "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/josh.mp3" 
  },
  { 
    id: "VR6AewLTigWg4xSOukaG", 
    name: "Arnold", 
    gender: "Nam", 
    traits: "Mỹ, Giọng Crispy", 
    provider: "elevenlabs", 
    lang: "multi" 
  },
  
  // -- Popular Female (Multilingual capable) --
  { 
    id: "21m00Tcm4TlvDq8ikWAM", 
    name: "Rachel", 
    gender: "Nữ", 
    traits: "Mỹ, Thuyết minh, Điềm tĩnh", 
    provider: "elevenlabs", 
    lang: "multi",
    previewUrl: "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/rachel.mp3"
  },
  { 
    id: "AZnzlk1XvdvUeBnXmlld", 
    name: "Domi", 
    gender: "Nữ", 
    traits: "Mỹ, Mạnh mẽ, Tin tức", 
    provider: "elevenlabs", 
    lang: "multi",
    previewUrl: "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/domi.mp3"
  },
  { 
    id: "EXAVITQu4vr4xnSDxMaL", 
    name: "Bella", 
    gender: "Nữ", 
    traits: "Mỹ, Dịu dàng, Kể chuyện", 
    provider: "elevenlabs", 
    lang: "multi",
    previewUrl: "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/bella.mp3"
  },
  { 
    id: "FGY2WhTYpPnrIDTdsKH5", 
    name: "Laura", 
    gender: "Nữ", 
    traits: "Mỹ, Upbeat, Social Media", 
    provider: "elevenlabs", 
    lang: "multi" 
  },
  { 
    id: "jsCqWAovK2LkecY7zXl4", 
    name: "Freya", 
    gender: "Nữ", 
    traits: "Mỹ, Trầm, Dẫn truyện", 
    provider: "elevenlabs", 
    lang: "multi" 
  },
  { 
    id: "XrExE9yKIg1WjnnlVkGX", 
    name: "Matilda", 
    gender: "Nữ", 
    traits: "Mỹ, Ấm áp, Audiobook", 
    provider: "elevenlabs", 
    lang: "multi",
    previewUrl: "https://storage.googleapis.com/eleven-public-cdn/audio/marketing/matilda.mp3"
  },

  // -- UK English (Can also speak VN via Multilingual Model) --
  { 
    id: "JBFqnCBsd6RMkjVDRZzb", // Updated Correct ID
    name: "George", 
    gender: "Nam", 
    traits: "Anh, Ấm áp, Tường thuật", 
    provider: "elevenlabs", 
    lang: "multi" 
  },
  { 
    id: "bVMeCyTHy58xNoL34h3p", 
    name: "Jeremy", 
    gender: "Nam", 
    traits: "Anh, Trầm, Quý ông", 
    provider: "elevenlabs", 
    lang: "multi" 
  },
  { 
    id: "ODq5zmih8GrVes37Dizj", // Updated Correct ID
    name: "Patrick", 
    gender: "Nam", 
    traits: "Anh, Shouty, Hype", 
    provider: "elevenlabs", 
    lang: "multi" 
  },
  
  // -- Specific Character Voices (Keep Language Tag for filtering if needed, or make multi) --
  { id: "7Y44f81P8s14FvG8l8Xl", name: "Takumi", gender: "Nam", traits: "Nhật, Điềm đạm", provider: "elevenlabs", lang: "ja-JP" },
  { id: "bIHjv166Xa93aQ9gX0lD", name: "Kyoko", gender: "Nữ", traits: "Nhật, Anime, Trong sáng", provider: "elevenlabs", lang: "ja-JP" },
  
  { id: "YkO5Hq58XX50Q6S2w1lE", name: "Jin-Soo", gender: "Nam", traits: "Hàn, Tin tức, Nghiêm túc", provider: "elevenlabs", lang: "ko-KR" },
  { id: "65r76831Q871w21285Xl", name: "So-Young", gender: "Nữ", traits: "Hàn, Dịu dàng, Kể chuyện", provider: "elevenlabs", lang: "ko-KR" },

  // Special ID to trigger input field
  { id: "custom_input", name: "➕ Nhập Voice ID khác...", gender: "Tùy chỉnh", traits: "Nhập ID giọng của bạn", provider: "elevenlabs", lang: "all" },
];

export const TONES = [
  "Tiêu chuẩn",
  "Điềm tĩnh",
  "Cảm xúc",
  "Điện ảnh",
  "Người máy",
  "Kể chuyện",
  "Truyền cảm hứng",
  "Thì thầm",
  "Tài liệu sâu sắc"
];

export const STYLES = [
  "Tiêu chuẩn",
  "Người dẫn chuyện nam uy quyền",
  "Người kể chuyện nữ nhẹ nhàng",
  "Giọng TikTok nhanh",
  "Giọng AI Robot",
  "Bản tin thời sự",
  "Trò chuyện đời thường",
  "YouTuber năng động",
  "Hướng dẫn viên nhẹ nhàng"
];

export const APP_BACKGROUNDS = [
  { name: "Midnight Blue (Xanh Dương Đêm)", value: "#003366" },
  { name: "Deep Emerald (Xanh Lục Bảo Đậm)", value: "#024B30" },
  { name: "Charcoal Grey (Xám Than Chì)", value: "#36454F" },
  { name: "Champagne Cream (Kem Champagne)", value: "#F7E7CE", isLight: true },
  { name: "Royal Burgundy (Đỏ Rượu Vang)", value: "#800020" },
  { name: "Taupe (Nâu Xám)", value: "#483C32" },
  { name: "Dark Teal (Xanh Mòng Két Đậm)", value: "#006D77" },
  { name: "Deep Plum (Tím Mận Chín)", value: "#4E0F2B" },
  { name: "Antique Gold (Vàng Đồng Cổ)", value: "#C9A66B", isLight: true },
  { name: "Slate Blue (Xanh Xám Khói)", value: "#5F7186" }
];
