
import React, { useState, useEffect } from 'react';
import { ScriptForm } from './components/ScriptForm';
import { ScriptOutput } from './components/ScriptOutput';
import { generateSpeechGemini, getStoredApiKeys, setStoredApiKeys } from './services/geminiService';
import { generateSpeechElevenLabs, getStoredElevenLabsKeys, setStoredElevenLabsKeys } from './services/elevenLabsService';
import { TTSConfig, GeneratedAudio, GenerationStatus, SavedScript, AudioSegment } from './types';
import { APP_BACKGROUNDS } from './constants';
import { Mic, Sparkles, Volume2, Palette, Settings, Key, X, ExternalLink, ShieldCheck, AlertCircle, Activity, Info, BookOpen, History, Trash2, ArrowRightCircle } from 'lucide-react';

function App() {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [result, setResult] = useState<GeneratedAudio | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Random background on initialization
  const [bgColor, setBgColor] = useState(() => {
    const randomIndex = Math.floor(Math.random() * APP_BACKGROUNDS.length);
    return APP_BACKGROUNDS[randomIndex];
  });
  
  // API Keys State
  const [showApiModal, setShowApiModal] = useState(false);
  const [geminiKeysText, setGeminiKeysText] = useState("");
  const [elevenLabsKeysText, setElevenLabsKeysText] = useState("");
  const [hasGemini, setHasGemini] = useState(false);
  const [hasElevenLabs, setHasElevenLabs] = useState(false);

  // Guide & Library State
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [library, setLibrary] = useState<SavedScript[]>(() => {
     try {
         const saved = localStorage.getItem('TTS_SCRIPT_LIBRARY');
         return saved ? JSON.parse(saved) : [];
     } catch (e) { 
         console.warn("Failed to load library from localStorage", e);
         return []; 
     }
  });
  const [selectedScript, setSelectedScript] = useState<SavedScript | null>(null);

  // Initialize keys from storage on mount
  useEffect(() => {
    const geminiKeys = getStoredApiKeys();
    setGeminiKeysText(geminiKeys.join('\n'));
    setHasGemini(geminiKeys.length > 0 || !!process.env.API_KEY);

    const elKeys = getStoredElevenLabsKeys();
    setElevenLabsKeysText(elKeys.join('\n'));
    setHasElevenLabs(elKeys.length > 0);
  }, []);

  // Save library to local storage with safety check
  useEffect(() => {
    try {
      localStorage.setItem('TTS_SCRIPT_LIBRARY', JSON.stringify(library));
    } catch (e) {
      console.error("Failed to save library to localStorage (Quota exceeded?)", e);
      setError("Bộ nhớ trình duyệt đã đầy. Không thể lưu thêm kịch bản vào thư viện.");
    }
  }, [library]);

  const handleGenerateAudio = async (config: TTSConfig) => {
    // Validation based on provider
    if (config.provider === 'gemini' && !hasGemini) {
      setShowApiModal(true);
      setError("Vui lòng cấu hình Gemini API Key.");
      return;
    }
    if (config.provider === 'elevenlabs' && !hasElevenLabs) {
      setShowApiModal(true);
      setError("Vui lòng cấu hình ElevenLabs API Key.");
      return;
    }

    setStatus(GenerationStatus.GENERATING);
    setError(null);
    
    // Initialize result with empty segments
    const initialResult: GeneratedAudio = {
      segments: [],
      text: config.text,
      voice: config.voice,
      provider: config.provider,
      language: config.language,
      timestamp: Date.now()
    };
    setResult(initialResult);

    // Callback to update segments in real-time
    config.onSegmentGenerated = (segment: AudioSegment) => {
        setResult(prev => {
            if (!prev) return initialResult;
            return {
                ...prev,
                segments: [...prev.segments, segment]
            };
        });
    };
    
    try {
      let finalData;
      if (config.provider === 'elevenlabs') {
        finalData = await generateSpeechElevenLabs(config);
      } else {
        finalData = await generateSpeechGemini(config);
      }

      // Update with final full audio URL
      setResult(prev => {
          if (!prev) return null;
          return {
              ...prev,
              fullAudioUrl: finalData.audioUrl
          };
      });
      setStatus(GenerationStatus.SUCCESS);

      // Auto save to library
      const newScript: SavedScript = {
          id: Date.now().toString(),
          text: config.text,
          voice: config.voice,
          provider: config.provider,
          language: config.language,
          tone: config.tone || "Tiêu chuẩn",
          style: config.style || "Tiêu chuẩn",
          instructions: config.instructions || "",
          timestamp: Date.now(),
          elevenLabsModel: config.elevenLabsModel 
      };
      setLibrary(prev => [newScript, ...prev]);

    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tạo giọng nói.");
      setStatus(GenerationStatus.ERROR);
      if (err.message?.toLowerCase().includes("api key") || err.message?.includes("401")) {
        setShowApiModal(true);
      }
    }
  };

  const handleReset = () => {
    setResult(null);
    setStatus(GenerationStatus.IDLE);
    setError(null);
  };

  const saveApiKeys = () => {
    const geminiKeysList = geminiKeysText.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    setStoredApiKeys(geminiKeysList);
    setHasGemini(geminiKeysList.length > 0 || !!process.env.API_KEY);

    const elKeysList = elevenLabsKeysText.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    setStoredElevenLabsKeys(elKeysList);
    setHasElevenLabs(elKeysList.length > 0);

    setShowApiModal(false);
    setError(null);
  };

  const deleteScript = (id: string) => {
      setLibrary(prev => prev.filter(item => item.id !== id));
  };

  const clearLibrary = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ kịch bản đã lưu? Hành động này không thể hoàn tác.")) {
      setLibrary([]);
    }
  };

  const loadScript = (script: SavedScript) => {
      setSelectedScript(script);
      setShowLibraryModal(false);
  };

  return (
    <div 
      className="min-h-screen pb-12 font-sans transition-colors duration-700"
      style={{ backgroundColor: bgColor.value, color: bgColor.isLight ? '#1e293b' : '#e2e8f0' }}
    >
      {/* ... (Modal Components same as before) ... */}
      {/* --- GUIDE MODAL --- */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-brand-400" /> Hướng dẫn & Điểm mạnh
                </h2>
                <button onClick={() => setShowGuideModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
              </div>
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                 {/* Strengths */}
                 <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-brand-300 uppercase tracking-wide border-b border-slate-800 pb-2">🔥 Điểm mạnh nổi bật</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                           <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold"><Activity className="w-4 h-4"/> Đa Luồng API</div>
                           <p className="text-sm text-slate-400 leading-relaxed">Hỗ trợ nhập nhiều API Key cùng lúc. Hệ thống tự động luân phiên (Round-Robin) để tránh giới hạn request (Quota Limit).</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                           <div className="flex items-center gap-2 mb-2 text-brand-400 font-bold"><Sparkles className="w-4 h-4"/> Gemini 2.5 & 3 Pro</div>
                           <p className="text-sm text-slate-400 leading-relaxed">Sử dụng Gemini 2.5 Flash cho tốc độ TTS cực nhanh và Gemini 3 Pro Preview để phân tích giọng nói khi Clone.</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                           <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold"><Volume2 className="w-4 h-4"/> ElevenLabs Integration</div>
                           <p className="text-sm text-slate-400 leading-relaxed">Tích hợp ElevenLabs Multilingual v2 cho chất lượng giọng đọc tự nhiên nhất thế giới.</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                           <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold"><Mic className="w-4 h-4"/> Voice Cloning</div>
                           <p className="text-sm text-slate-400 leading-relaxed">Chỉ cần upload 1 file âm thanh (10-30s), AI sẽ phân tích Timber & Style để tái tạo giọng nói tương tự.</p>
                        </div>
                    </div>
                 </section>

                 {/* Usage */}
                 <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-brand-300 uppercase tracking-wide border-b border-slate-800 pb-2">🛠️ Cách sử dụng</h3>
                    <ol className="space-y-3 text-sm text-slate-300 list-decimal list-inside bg-slate-950 p-6 rounded-xl border border-slate-800">
                        <li>Vào mục <strong>Cấu hình API</strong> để nhập Key (Gemini hoặc ElevenLabs).</li>
                        <li>Chọn <strong>Nhà cung cấp</strong> (Gemini/ElevenLabs) và <strong>Ngôn ngữ</strong>.</li>
                        <li>Chọn <strong>Giọng đọc</strong> có sẵn hoặc upload file để <strong>Clone giọng</strong>.</li>
                        <li>Nhập văn bản, tùy chỉnh <strong>Tông giọng (Tone)</strong> và <strong>Phong cách (Style)</strong>.</li>
                        <li>Nhấn <strong>Tạo</strong> và chờ kết quả. Kịch bản sẽ tự động lưu vào <strong>Thư viện</strong>.</li>
                    </ol>
                 </section>
              </div>
           </div>
        </div>
      )}

      {/* --- LIBRARY MODAL --- */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                   <div className="bg-indigo-500/10 p-2 rounded-lg"><History className="w-6 h-6 text-indigo-400" /></div>
                   <div>
                       <h2 className="text-xl font-bold text-white">Thư viện Kịch bản</h2>
                       <p className="text-xs text-slate-500">Lịch sử các đoạn text bạn đã tạo voice</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                    {library.length > 0 && (
                      <button 
                        onClick={clearLibrary}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                      </button>
                    )}
                    <button onClick={() => setShowLibraryModal(false)} className="p-1 hover:bg-white/5 rounded-full"><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-900">
                 {library.length === 0 ? (
                     <div className="h-48 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        <History className="w-10 h-10 mb-2 opacity-50" />
                        <p>Chưa có kịch bản nào được lưu.</p>
                     </div>
                 ) : (
                     <div className="space-y-3">
                        {library.map((item) => (
                           <div key={item.id} className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-brand-500/30 rounded-xl p-4 transition-all shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.provider === 'gemini' ? 'bg-sky-500/10 text-sky-400' : 'bg-white/10 text-slate-300'}`}>
                                       {item.provider}
                                    </span>
                                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{item.language}</span>
                                    <span className="text-[10px] text-slate-500">• {new Date(item.timestamp).toLocaleString()}</span>
                                 </div>
                                 <p className="text-white font-medium text-sm line-clamp-2 leading-relaxed">{item.text}</p>
                                 <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                     <Mic className="w-3 h-3" /> Voice: {item.voice} • {item.tone}
                                     {item.elevenLabsModel && (
                                         <span className="bg-indigo-500/20 text-indigo-300 px-1 rounded ml-1">{item.elevenLabsModel.replace('eleven_', '')}</span>
                                     )}
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                  <button 
                                    onClick={() => loadScript(item)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-brand-500/10"
                                  >
                                     Sử dụng <ArrowRightCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => deleteScript(item.id)}
                                    className="px-3 py-2 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg transition-colors"
                                    title="Xóa"
                                  >
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                           </div>
                        ))}
                     </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* API Configuration Modal (Same as before) */}
      {showApiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/10 rounded-lg">
                  <Key className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Quản lý API Key (Đa luồng)</h2>
                  <p className="text-xs text-slate-400">Hệ thống sẽ tự động luân phiên (Round-Robin) các key.</p>
                </div>
              </div>
              <button onClick={() => setShowApiModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              
              {/* Gemini Key Section */}
              <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-brand-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Gemini API Keys
                    <span className="bg-slate-700 text-white px-1.5 py-0.5 rounded text-[10px]">
                      {geminiKeysText.split('\n').filter(k => k.trim()).length} Keys
                    </span>
                  </label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1">
                    Lấy Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <textarea 
                    value={geminiKeysText}
                    onChange={(e) => setGeminiKeysText(e.target.value)}
                    placeholder="Dán danh sách API Key tại đây, mỗi Key một dòng..."
                    className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 transition-all text-sm font-mono resize-none leading-relaxed"
                    spellCheck={false}
                  />
                  <div className="absolute right-3 top-3 text-slate-600 pointer-events-none">
                    <Info className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic">Ví dụ: <br/>AIzaSy...1<br/>AIzaSy...2</p>
              </div>

              {/* ElevenLabs Key Section */}
              <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3 h-3" /> ElevenLabs API Keys
                     <span className="bg-slate-700 text-white px-1.5 py-0.5 rounded text-[10px]">
                      {elevenLabsKeysText.split('\n').filter(k => k.trim()).length} Keys
                    </span>
                  </label>
                  <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1">
                    Lấy Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <textarea 
                    value={elevenLabsKeysText}
                    onChange={(e) => setElevenLabsKeysText(e.target.value)}
                    placeholder="Dán danh sách API Key tại đây, mỗi Key một dòng..."
                    className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-mono resize-none leading-relaxed"
                    spellCheck={false}
                  />
                  <div className="absolute right-3 top-3 text-slate-600 pointer-events-none">
                    <Info className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-xs text-slate-500">
                  Keys được lưu an toàn tại <strong>localStorage</strong> trình duyệt. Hệ thống sẽ sử dụng tuần tự từng key trong danh sách mỗi khi bạn tạo giọng nói để tối ưu quota.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-800 shrink-0">
              <button 
                onClick={saveApiKeys}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-600/20 active:scale-95"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden mix-blend-overlay opacity-30">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b mb-6 transition-colors duration-500 ${bgColor.isLight ? 'bg-white/70 border-slate-200' : 'bg-slate-950/20 border-white/10'}`}>
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex flex-col gap-1">
             {/* Color Picker Dropdown */}
             <div className="flex items-center gap-2 group relative">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${bgColor.isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                   <Palette className="w-3 h-3" />
                   <span>Màu nền: {bgColor.name}</span>
                </div>
                {/* Dropdown Content */}
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-left z-50 border border-slate-200">
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase border-b border-slate-100 mb-1">Chọn màu nền</div>
                  {APP_BACKGROUNDS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setBgColor(color)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-600 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: color.value }} />
                      <span className={bgColor.value === color.value ? 'font-bold' : ''}>{color.name}</span>
                    </button>
                  ))}
                </div>
             </div>

             <div 
               className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
               onClick={() => window.location.reload()}
               title="Tải lại trang và đổi màu nền"
             >
                <div className="w-8 h-8 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                  <Mic className="w-5 h-5" />
                </div>
                <span className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${bgColor.isLight ? 'from-slate-800 to-slate-500' : 'from-white to-slate-400'}`}>
                  App Tạo và Clone Giọng Nói
                </span>
             </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Guide Button */}
            <button
               onClick={() => setShowGuideModal(true)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold ${bgColor.isLight ? 'border-slate-300 bg-white/50 hover:bg-white text-slate-700' : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'}`}
               title="Xem hướng dẫn sử dụng"
            >
               <BookOpen className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Hướng dẫn</span>
            </button>

             {/* Library Button */}
             <button
               onClick={() => setShowLibraryModal(true)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold relative ${bgColor.isLight ? 'border-slate-300 bg-white/50 hover:bg-white text-slate-700' : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'}`}
               title="Thư viện kịch bản"
            >
               <History className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Thư viện</span>
               {library.length > 0 && (
                 <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
               )}
            </button>

            {/* Config Button */}
            <button 
              onClick={() => setShowApiModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold ${
                (hasGemini || hasElevenLabs)
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 animate-pulse'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Cấu hình API</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 relative z-10">
        
        {/* Error Banner */}
        {status === GenerationStatus.ERROR && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            {error?.includes("cấu hình") && (
              <button 
                onClick={() => setShowApiModal(true)}
                className="ml-auto text-xs font-bold underline hover:no-underline"
              >
                Cài đặt ngay
              </button>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8 items-stretch min-h-[650px]">
          {/* Left Column: Input Form */}
          <div className={`lg:col-span-5 flex flex-col transition-all duration-500 ${status === GenerationStatus.SUCCESS || (result && result.segments.length > 0) ? 'hidden xl:flex' : ''}`}>
               <ScriptForm 
                 onGenerateAudio={handleGenerateAudio}
                 isGenerating={status === GenerationStatus.GENERATING}
                 loadedScript={selectedScript}
               />
          </div>

          {/* Right Column: Output or Placeholder */}
          <div className={`lg:col-span-7 w-full transition-all duration-500`}>
            {(result && result.segments.length > 0) ? (
              <ScriptOutput 
                result={result} 
                onReset={handleReset} 
                isGenerating={status === GenerationStatus.GENERATING}
              />
            ) : (
               <div className={`h-full flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-2xl p-8 text-center transition-opacity duration-300 ${status === GenerationStatus.GENERATING ? 'opacity-50' : 'opacity-100'} ${bgColor.isLight ? 'border-slate-300 bg-white/40' : 'border-slate-800 bg-slate-900/30'}`}>
                 {status === GenerationStatus.GENERATING ? (
                    <div className="animate-pulse flex flex-col items-center">
                       <div className="w-24 h-24 bg-brand-500/10 rounded-full flex items-center justify-center mb-6 relative">
                          <Volume2 className="w-12 h-12 text-brand-400" />
                          <div className="absolute inset-0 rounded-full border-4 border-brand-500/30 border-t-brand-500 animate-spin"></div>
                       </div>
                       <h3 className={`text-2xl font-medium mb-2 ${bgColor.isLight ? 'text-slate-800' : 'text-white'}`}>Đang tổng hợp âm thanh...</h3>
                       <p className={`${bgColor.isLight ? 'text-slate-600' : 'text-slate-400'}`}>Đang áp dụng cài đặt giọng, tông và phong cách.</p>
                    </div>
                 ) : (
                   <>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner ${bgColor.isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                      <Mic className={`w-10 h-10 ${bgColor.isLight ? 'text-slate-500' : 'text-slate-600'}`} />
                    </div>
                    <h3 className={`text-2xl font-medium mb-3 ${bgColor.isLight ? 'text-slate-800' : 'text-white'}`}>Studio Giọng nói Chuyên nghiệp</h3>
                    <p className={`max-w-md leading-relaxed ${bgColor.isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Chọn Nhà cung cấp (Gemini/ElevenLabs), ngôn ngữ, giọng đọc và nhập văn bản để bắt đầu.
                    </p>
                    {(!hasGemini && !hasElevenLabs) && (
                      <button 
                        onClick={() => setShowApiModal(true)}
                        className="mt-8 px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-bold shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2"
                      >
                        <Key className="w-4 h-4" />
                        Nhập API Key để bắt đầu
                      </button>
                    )}
                   </>
                 )}
               </div>
            )}
          </div>
        </div>
      </main>

      <footer className={`mt-20 py-8 border-t text-center ${bgColor.isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-slate-400'}`}>
        <p className="text-sm">&copy; {new Date().getFullYear()} Gemini TTS. Xây dựng bằng Google GenAI SDK.</p>
      </footer>
    </div>
  );
}

export default App;
