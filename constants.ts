
export const LANGUAGES = [
  { code: "vi-VN", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en-US", name: "Tiếng Anh (Mỹ)", flag: "🇺🇸" },
  { code: "en-GB", name: "Tiếng Anh (Anh)", flag: "🇬🇧" },
  { code: "ja-JP", name: "Tiếng Nhật", flag: "🇯🇵" },
  { code: "ko-KR", name: "Tiếng Hàn", flag: "🇰🇷" },
  { code: "fr-FR", name: "Tiếng Pháp", flag: "🇫🇷" },
  { code: "es-ES", name: "Tiếng Tây Ban Nha", flag: "🇪🇸" },
  { code: "de-DE", name: "Tiếng Đức", flag: "🇩🇪" },
  { code: "zh-CN", name: "Tiếng Trung", flag: "🇨🇳" },
];

export const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini', icon: 'Sparkles' },
  { id: 'edge', name: 'Microsoft Edge TTS', icon: 'Mic' }
];

// Threshold to automatically split requests into separate library entries
// 2500 is safe and keeps Gemini generation snappy
export const AUTO_SPLIT_THRESHOLD = 1000; 

export const GEMINI_MODELS = [
  {
    id: 'gemini-3.0-flash-preview-tts',
    name: 'Gemini 3.0 Flash (Mới nhất - Nhanh)',
    description: 'Model mới nhất, tối ưu tốc độ, độ trễ thấp, chi phí tiết kiệm. Phù hợp hội thoại thời gian thực.'
  },
  {
    id: 'gemini-3.0-pro-preview-tts',
    name: 'Gemini 3.0 Pro (Mới nhất - Chất lượng cao)',
    description: 'Model mới nhất, chất lượng âm thanh cao nhất, độ biểu cảm tốt, phù hợp audiobook, thuyết minh.'
  },
  {
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini 2.5 Flash (Nhanh)',
    description: 'Tối ưu tốc độ, độ trễ thấp, chi phí tiết kiệm. Phù hợp hội thoại thời gian thực.'
  },
  {
    id: 'gemini-2.5-pro-preview-tts',
    name: 'Gemini 2.5 Pro (Chất lượng cao)',
    description: 'Chất lượng âm thanh cao nhất, độ biểu cảm tốt, phù hợp audiobook, thuyết minh.'
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
  
  // --- GEMINI VOICES (VIETNAMESE - EXTRA PERSONAS) ---
  { id: "Aoede_News", name: "Bảo Trâm (Thời sự)", gender: "Nữ", traits: "Trang trọng, Rõ ràng", provider: "gemini", lang: "vi-VN" },
  { id: "Charon_Doc", name: "Quốc Khánh (Tài liệu)", gender: "Nam", traits: "Trầm ấm, Chậm rãi", provider: "gemini", lang: "vi-VN" },
  { id: "Fenrir_Review", name: "Tuấn Anh (Reviewer)", gender: "Nam", traits: "Nhanh, Năng động", provider: "gemini", lang: "vi-VN" },
  { id: "Kore_Story", name: "Thu Thảo (Kể chuyện)", gender: "Nữ", traits: "Nhẹ nhàng, Cảm xúc", provider: "gemini", lang: "vi-VN" },
  { id: "Puck_Vlog", name: "Hải Đăng (Vlogger)", gender: "Nam", traits: "Tự nhiên, Gần gũi", provider: "gemini", lang: "vi-VN" },
  { id: "Zephyr_Audiobook", name: "Bích Ngọc (Sách nói)", gender: "Nữ", traits: "Trong trẻo, Truyền cảm", provider: "gemini", lang: "vi-VN" },
  { id: "Aoede_Podcast", name: "Phương Ly (Podcast)", gender: "Nữ", traits: "Hiện đại, Cuốn hút", provider: "gemini", lang: "vi-VN" },
  { id: "Charon_Story", name: "Thành Lộc (Truyện ma)", gender: "Nam", traits: "Bí ẩn, Lôi cuốn", provider: "gemini", lang: "vi-VN" },
  { id: "Fenrir_Sport", name: "Quang Huy (Bình luận)", gender: "Nam", traits: "Hào hứng, Thể thao", provider: "gemini", lang: "vi-VN" },
  { id: "Kore_Meditation", name: "Hương Giang (Thiền)", gender: "Nữ", traits: "Thư thái, Chậm rãi", provider: "gemini", lang: "vi-VN" },

  // --- GEMINI (US ENGLISH) ---
  { id: "Aoede_US", name: "Aoede (US)", gender: "Nữ", traits: "Confident, Professional", provider: "gemini", lang: "en-US" },
  { id: "Charon_US", name: "Charon (US)", gender: "Nam", traits: "Deep, Authoritative", provider: "gemini", lang: "en-US" },
  { id: "Fenrir_US", name: "Fenrir (US)", gender: "Nam", traits: "Energetic, Strong", provider: "gemini", lang: "en-US" },
  { id: "Kore_US", name: "Kore (US)", gender: "Nữ", traits: "Calm, Soothing", provider: "gemini", lang: "en-US" },
  { id: "Puck_US", name: "Puck (US)", gender: "Nam", traits: "Natural, Spoken", provider: "gemini", lang: "en-US" },
  { id: "Zephyr_US", name: "Zephyr (US)", gender: "Nữ", traits: "High pitched, Sweet", provider: "gemini", lang: "en-US" },
  { id: "Aoede_US_News", name: "Aoede (News)", gender: "Nữ", traits: "Formal, News", provider: "gemini", lang: "en-US" },
  { id: "Charon_US_Doc", name: "Charon (Doc)", gender: "Nam", traits: "Deep, Slow", provider: "gemini", lang: "en-US" },
  { id: "Kore_US_Story", name: "Kore (Story)", gender: "Nữ", traits: "Gentle, Emotional", provider: "gemini", lang: "en-US" },
  { id: "Puck_US_Vlog", name: "Puck (Vlog)", gender: "Nam", traits: "Natural, Friendly", provider: "gemini", lang: "en-US" },

  // --- GEMINI (UK ENGLISH - Mapped) ---
  { id: "Puck_GB", name: "Arthur (Puck)", gender: "Nam", traits: "British, Formal", provider: "gemini", lang: "en-GB" },
  { id: "Kore_GB", name: "Emma (Kore)", gender: "Nữ", traits: "British, Gentle", provider: "gemini", lang: "en-GB" },
  { id: "Fenrir_GB", name: "Harry (Fenrir)", gender: "Nam", traits: "British, Energetic", provider: "gemini", lang: "en-GB" },
  { id: "Aoede_GB", name: "Sophie (Aoede)", gender: "Nữ", traits: "British, Professional", provider: "gemini", lang: "en-GB" },

  // --- GEMINI (JAPANESE - Mapped) ---
  { id: "Kore_JP", name: "Sakura (Kore)", gender: "Nữ", traits: "Soft, Anime style", provider: "gemini", lang: "ja-JP" },
  { id: "Charon_JP", name: "Kenji (Charon)", gender: "Nam", traits: "Deep, Samurai", provider: "gemini", lang: "ja-JP" },
  { id: "Zephyr_JP", name: "Hina (Zephyr)", gender: "Nữ", traits: "High pitch, Cute", provider: "gemini", lang: "ja-JP" },
  { id: "Puck_JP", name: "Hiro (Puck)", gender: "Nam", traits: "Natural, Young", provider: "gemini", lang: "ja-JP" },

  // --- GEMINI (KOREAN - Mapped) ---
  { id: "Aoede_KR", name: "Ji-woo (Aoede)", gender: "Nữ", traits: "Professional, News", provider: "gemini", lang: "ko-KR" },
  { id: "Puck_KR", name: "Min-ho (Puck)", gender: "Nam", traits: "Casual, Drama", provider: "gemini", lang: "ko-KR" },
  { id: "Zephyr_KR", name: "Soo-jin (Zephyr)", gender: "Nữ", traits: "Sweet, K-Pop", provider: "gemini", lang: "ko-KR" },

  // --- GEMINI (FRENCH - Mapped) ---
  { id: "Aoede_FR", name: "Camille (Aoede)", gender: "Nữ", traits: "French, Elegant", provider: "gemini", lang: "fr-FR" },
  { id: "Charon_FR", name: "Jean (Charon)", gender: "Nam", traits: "French, Deep", provider: "gemini", lang: "fr-FR" },
  { id: "Zephyr_FR", name: "Chloé (Zephyr)", gender: "Nữ", traits: "French, Sweet", provider: "gemini", lang: "fr-FR" },

  // --- GEMINI (SPANISH - Mapped) ---
  { id: "Fenrir_ES", name: "Carlos (Fenrir)", gender: "Nam", traits: "Spanish, Energetic", provider: "gemini", lang: "es-ES" },
  { id: "Kore_ES", name: "Isabella (Kore)", gender: "Nữ", traits: "Spanish, Calm", provider: "gemini", lang: "es-ES" },
  { id: "Puck_ES", name: "Mateo (Puck)", gender: "Nam", traits: "Spanish, Natural", provider: "gemini", lang: "es-ES" },

  // --- GEMINI (GERMAN - Mapped) ---
  { id: "Charon_DE", name: "Klaus (Charon)", gender: "Nam", traits: "German, Authoritative", provider: "gemini", lang: "de-DE" },
  { id: "Aoede_DE", name: "Anna (Aoede)", gender: "Nữ", traits: "German, Professional", provider: "gemini", lang: "de-DE" },

  // --- GEMINI (CHINESE - Mapped) ---
  { id: "Kore_CN", name: "Mei (Kore)", gender: "Nữ", traits: "Chinese, Gentle", provider: "gemini", lang: "zh-CN" },
  { id: "Puck_CN", name: "Wei (Puck)", gender: "Nam", traits: "Chinese, Casual", provider: "gemini", lang: "zh-CN" },

  // --- EDGE TTS (VIETNAMESE) ---
  { id: "vi-VN-HoaiMyNeural", name: "Hoài My", gender: "Nữ", traits: "Tự nhiên, Rõ ràng", provider: "edge", lang: "vi-VN" },
  { id: "vi-VN-NamMinhNeural", name: "Nam Minh", gender: "Nam", traits: "Trầm ấm, Chuyên nghiệp", provider: "edge", lang: "vi-VN" },

  // --- EDGE TTS (ENGLISH) ---
  { id: "en-US-AriaNeural", name: "Aria", gender: "Nữ", traits: "Confident, Professional", provider: "edge", lang: "en-US" },
  { id: "en-US-GuyNeural", name: "Guy", gender: "Nam", traits: "Deep, Authoritative", provider: "edge", lang: "en-US" },
  { id: "en-US-JennyNeural", name: "Jenny", gender: "Nữ", traits: "Friendly, Clear", provider: "edge", lang: "en-US" },
  { id: "en-US-ChristopherNeural", name: "Christopher", gender: "Nam", traits: "Reliable, Clear", provider: "edge", lang: "en-US" },
  { id: "en-US-AnaNeural", name: "Ana", gender: "Nữ", traits: "Child, Cheerful", provider: "edge", lang: "en-US" },
  { id: "en-US-AndrewNeural", name: "Andrew", gender: "Nam", traits: "Warm, Engaging", provider: "edge", lang: "en-US" },
  { id: "en-US-BrianNeural", name: "Brian", gender: "Nam", traits: "Versatile, Clear", provider: "edge", lang: "en-US" },
  { id: "en-US-EmmaNeural", name: "Emma", gender: "Nữ", traits: "Friendly, Upbeat", provider: "edge", lang: "en-US" },
  { id: "en-US-EricNeural", name: "Eric", gender: "Nam", traits: "Casual, Conversational", provider: "edge", lang: "en-US" },
  { id: "en-US-MichelleNeural", name: "Michelle", gender: "Nữ", traits: "Expressive, Warm", provider: "edge", lang: "en-US" },
  { id: "en-US-RogerNeural", name: "Roger", gender: "Nam", traits: "Confident, Storytelling", provider: "edge", lang: "en-US" },
  { id: "en-US-SteffanNeural", name: "Steffan", gender: "Nam", traits: "Professional, News", provider: "edge", lang: "en-US" },
  { id: "en-GB-SoniaNeural", name: "Sonia", gender: "Nữ", traits: "British, Elegant", provider: "edge", lang: "en-GB" },
  { id: "en-GB-RyanNeural", name: "Ryan", gender: "Nam", traits: "British, Professional", provider: "edge", lang: "en-GB" },
  { id: "en-GB-LibbyNeural", name: "Libby", gender: "Nữ", traits: "British, Clear", provider: "edge", lang: "en-GB" },
  { id: "en-GB-MaisieNeural", name: "Maisie", gender: "Nữ", traits: "British, Child", provider: "edge", lang: "en-GB" },
  { id: "en-GB-ThomasNeural", name: "Thomas", gender: "Nam", traits: "British, Calm", provider: "edge", lang: "en-GB" },
  { id: "en-GB-OliverNeural", name: "Oliver", gender: "Nam", traits: "British, Conversational", provider: "edge", lang: "en-GB" },
  { id: "en-GB-MiaNeural", name: "Mia", gender: "Nữ", traits: "British, Warm", provider: "edge", lang: "en-GB" },
  { id: "en-AU-NatashaNeural", name: "Natasha", gender: "Nữ", traits: "Australian, Clear", provider: "edge", lang: "en-US" },
  { id: "en-AU-WilliamNeural", name: "William", gender: "Nam", traits: "Australian, Deep", provider: "edge", lang: "en-US" },
  { id: "en-CA-ClaraNeural", name: "Clara", gender: "Nữ", traits: "Canadian, Friendly", provider: "edge", lang: "en-US" },
  { id: "en-CA-LiamNeural", name: "Liam", gender: "Nam", traits: "Canadian, Professional", provider: "edge", lang: "en-US" },

  // --- EDGE TTS (JAPANESE) ---
  { id: "ja-JP-NanamiNeural", name: "Nanami", gender: "Nữ", traits: "Soft, Clear", provider: "edge", lang: "ja-JP" },
  { id: "ja-JP-KeitaNeural", name: "Keita", gender: "Nam", traits: "Deep, Professional", provider: "edge", lang: "ja-JP" },

  // --- EDGE TTS (KOREAN) ---
  { id: "ko-KR-SunHiNeural", name: "SunHi", gender: "Nữ", traits: "Clear, Professional", provider: "edge", lang: "ko-KR" },
  { id: "ko-KR-InJoonNeural", name: "InJoon", gender: "Nam", traits: "Deep, Calm", provider: "edge", lang: "ko-KR" },

  // --- EDGE TTS (FRENCH) ---
  { id: "fr-FR-DeniseNeural", name: "Denise", gender: "Nữ", traits: "Elegant, Clear", provider: "edge", lang: "fr-FR" },
  { id: "fr-FR-HenriNeural", name: "Henri", gender: "Nam", traits: "Professional, Deep", provider: "edge", lang: "fr-FR" },

  // --- EDGE TTS (SPANISH) ---
  { id: "es-ES-ElviraNeural", name: "Elvira", gender: "Nữ", traits: "Clear, Professional", provider: "edge", lang: "es-ES" },
  { id: "es-ES-AlvaroNeural", name: "Alvaro", gender: "Nam", traits: "Deep, Authoritative", provider: "edge", lang: "es-ES" },

  // --- EDGE TTS (GERMAN) ---
  { id: "de-DE-KatjaNeural", name: "Katja", gender: "Nữ", traits: "Clear, Professional", provider: "edge", lang: "de-DE" },
  { id: "de-DE-ConradNeural", name: "Conrad", gender: "Nam", traits: "Deep, Authoritative", provider: "edge", lang: "de-DE" },

  // --- EDGE TTS (CHINESE) ---
  { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao", gender: "Nữ", traits: "Clear, Natural", provider: "edge", lang: "zh-CN" },
  { id: "zh-CN-YunxiNeural", name: "Yunxi", gender: "Nam", traits: "Deep, Professional", provider: "edge", lang: "zh-CN" },
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
