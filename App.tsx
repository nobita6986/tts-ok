
import React, { useState, useEffect } from 'react';
import { ScriptForm } from './components/ScriptForm';
import { ScriptOutput } from './components/ScriptOutput';
import { generateSpeechGemini, getStoredApiKeys, setStoredApiKeys } from './services/geminiService';
import { generateSpeechElevenLabs, getStoredElevenLabsKeys, setStoredElevenLabsKeys } from './services/elevenLabsService';
import { TTSConfig, GeneratedAudio, GenerationStatus, SavedScript, AudioSegment, TTSProvider } from './types';
import { APP_BACKGROUNDS } from './constants';
import { Mic, Sparkles, Volume2, Palette, Settings, Key, X, ExternalLink, ShieldCheck, AlertCircle, Activity, Info, BookOpen, History, Trash2, ArrowRightCircle, Facebook, Shield, Globe, Save, Server } from 'lucide-react';

function App() {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [result, setResult] = useState<GeneratedAudio | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Lifted Provider State
  const [currentProvider, setCurrentProvider] = useState<TTSProvider>('gemini');

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

  // Proxy State
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [proxyKeysText, setProxyKeysText] = useState("");
  const [isProxyEnabled, setIsProxyEnabled] = useState(false);

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
  
  // Load script handler
  const loadScript = (script: SavedScript) => {
      setSelectedScript(script);
      setCurrentProvider(script.provider); // Update provider when loading script
      setShowLibraryModal(false);
  };

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

  // Proxy Handlers (Placeholder for future logic)
  const handleCheckProxyIP = () => {
      alert("Chức năng kiểm tra IP sẽ được cập nhật sau.");
  };

  const handleSaveProxy = () => {
      alert("Đã lưu cấu hình Proxy (Mô phỏng).");
      setShowProxyModal(false);
  };

  return (
    <div 
      className="min-h-screen pb-12 font-sans transition-colors duration-700"
      style={{ backgroundColor: bgColor.value, color: bgColor.isLight ? '#1e293b' : '#e2e8f0' }}
    >
      {/* --- API KEY CONFIG MODAL --- */}
      {showApiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" /> Cấu hình API Key
              </h2>
              <button onClick={() => setShowApiModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Gemini Section */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-brand-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Google Gemini API Keys
                    </label>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-brand-400 flex items-center gap-1 transition-colors">
                      Lấy Key <ExternalLink className="w-3 h-3" />
                    </a>
                 </div>
                 <div className="relative">
                   <textarea
                     value={geminiKeysText}
                     onChange={(e) => setGeminiKeysText(e.target.value)}
                     placeholder="Nhập danh sách API Key (mỗi dòng 1 key)..."
                     className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm resize-none custom-scrollbar"
                   />
                   <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded">
                     {geminiKeysText.split('\n').filter(k => k.trim()).length} Keys
                   </div>
                 </div>
                 <p className="text-xs text-slate-500 flex items-center gap-1">
                   <ShieldCheck className="w-3 h-3 text-emerald-500" />
                   Hệ thống sẽ tự động xoay vòng (Round-Robin) các Key để tránh giới hạn.
                 </p>
              </div>

              {/* ElevenLabs Section */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                 <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> ElevenLabs API Keys
                    </label>
                    <a href="https://elevenlabs.io/app/speech-synthesis" target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
                      Lấy Key <ExternalLink className="w-3 h-3" />
                    </a>
                 </div>
                 <div className="relative">
                   <textarea
                     value={elevenLabsKeysText}
                     onChange={(e) => setElevenLabsKeysText(e.target.value)}
                     placeholder="Nhập danh sách API Key (mỗi dòng 1 key)..."
                     className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm resize-none custom-scrollbar"
                   />
                   <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded">
                     {elevenLabsKeysText.split('\n').filter(k => k.trim()).length} Keys
                   </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowApiModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={saveApiKeys}
                  className="px-6 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all transform hover:-translate-y-0.5"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LIBRARY MODAL --- */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <History className="w-5 h-5 text-brand-400" /> Thư viện Kịch bản
               </h2>
               <div className="flex items-center gap-3">
                 <button 
                    onClick={clearLibrary}
                    disabled={library.length === 0}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-30 transition-colors"
                 >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                 </button>
                 <div className="w-px h-4 bg-slate-700"></div>
                 <button onClick={() => setShowLibraryModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
               </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-900/50">
               {library.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                       <BookOpen className="w-8 h-8 opacity-50" />
                    </div>
                    <p>Chưa có kịch bản nào được lưu.</p>
                 </div>
               ) : (
                 <div className="grid gap-4">
                    {library.map((item) => (
                      <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-brand-500/50 transition-all group">
                         <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-2">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${item.provider === 'gemini' ? 'bg-brand-900/50 text-brand-400' : 'bg-indigo-900/50 text-indigo-400'}`}>
                                    {item.provider}
                                  </span>
                                  <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">
                                     {new Date(item.timestamp).toLocaleString('vi-VN')}
                                  </span>
                               </div>
                               <p className="text-slate-300 text-sm line-clamp-2 font-medium mb-1">{item.text}</p>
                               <p className="text-slate-500 text-xs">
                                  Giọng: <span className="text-slate-400">{item.voice}</span> • 
                                  Tone: <span className="text-slate-400">{item.tone}</span> •
                                  Style: <span className="text-slate-400">{item.style}</span>
                               </p>
                            </div>
                            
                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => loadScript(item)}
                                 className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-lg"
                                 title="Tải kịch bản này"
                               >
                                  <ArrowRightCircle className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={() => deleteScript(item.id)}
                                 className="p-2 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-lg transition-colors"
                                 title="Xóa"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

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
                           <div className="flex items-center gap-2 mb-2 text-brand-400 font-bold"><Sparkles className="w-4 h-4"/> Gemini 2.5 Flash</div>
                           <p className="text-sm text-slate-400 leading-relaxed">Sử dụng Gemini 2.5 Flash cho tốc độ TTS cực nhanh, độ trễ thấp và giọng đọc tự nhiên.</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                           <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold"><Volume2 className="w-4 h-4"/> ElevenLabs Integration</div>
                           <p className="text-sm text-slate-400 leading-relaxed">Tích hợp ElevenLabs Multilingual v2 cho chất lượng giọng đọc tự nhiên nhất thế giới.</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                           <div className="flex items-center gap-2 mb-2 text-sky-400 font-bold"><Mic className="w-4 h-4"/> Xử lý văn bản dài</div>
                           <p className="text-sm text-slate-400 leading-relaxed">Tự động chia nhỏ văn bản thông minh theo chương/hồi để tối ưu hóa quá trình tạo giọng nói.</p>
                        </div>
                    </div>
                 </section>

                 {/* Usage */}
                 <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-brand-300 uppercase tracking-wide border-b border-slate-800 pb-2">🛠️ Cách sử dụng</h3>
                    <ol className="space-y-3 text-sm text-slate-300 list-decimal list-inside bg-slate-950 p-6 rounded-xl border border-slate-800">
                        <li>Vào mục <strong>Cấu hình API</strong> để nhập Key (Gemini hoặc ElevenLabs).</li>
                        <li>Chọn <strong>Nhà cung cấp</strong> ở thanh menu phía trên (Gemini hoặc ElevenLabs).</li>
                        <li>Chọn <strong>Ngôn ngữ</strong> và <strong>Giọng đọc</strong> từ danh sách.</li>
                        <li>Nhập văn bản, tùy chỉnh <strong>Tông giọng (Tone)</strong> và <strong>Phong cách (Style)</strong>.</li>
                        <li>Nhấn <strong>Tạo</strong> và chờ kết quả. Kịch bản sẽ tự động lưu vào <strong>Thư viện</strong>.</li>
                    </ol>
                 </section>
              </div>
           </div>
        </div>
      )}

      {/* --- PROXY MODAL --- */}
      {showProxyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-[#0f172a] border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                   <div>
                       <h2 className="text-lg font-bold text-white leading-none">Cấu hình Multi-Proxy (Pool)</h2>
                       <p className="text-[10px] text-slate-400 mt-1">Chỉ áp dụng cho ElevenLabs. Gemini sẽ kết nối trực tiếp.</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Toggle Switch */}
                    <div 
                        onClick={() => setIsProxyEnabled(!isProxyEnabled)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${isProxyEnabled ? 'bg-white' : 'bg-slate-700'}`}
                    >
                        <div className={`bg-slate-900 w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isProxyEnabled ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <button onClick={() => setShowProxyModal(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                 
                 {/* Input Area */}
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5" /> 
                            DANH SÁCH PROXY API KEY (MỖI DÒNG 1 KEY)
                        </label>
                        <a href="https://proxy.vn/?home=proxyxoay" target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium hover:underline">(Mua key tại đây)</a>
                    </div>
                    <textarea 
                        value={proxyKeysText}
                        onChange={(e) => setProxyKeysText(e.target.value)}
                        placeholder="Nhập API Key Proxy tại đây..."
                        className="w-full h-32 bg-[#020617] border border-slate-700 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-slate-500 placeholder-slate-600 resize-none custom-scrollbar"
                        spellCheck={false}
                    />
                    <p className="text-xs text-slate-500">Hệ thống sẽ dùng tất cả Key để tạo Pool Proxy cho ElevenLabs.</p>
                 </div>

                 {/* Action Buttons */}
                 <div className="grid grid-cols-2 gap-4">
                     <button 
                        onClick={handleCheckProxyIP}
                        className="flex items-center justify-center gap-2 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors border border-slate-600"
                     >
                         <Globe className="w-4 h-4" /> Kiểm tra IP
                     </button>
                     <button 
                        onClick={handleSaveProxy}
                        className="flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-900/20"
                     >
                         <Save className="w-4 h-4" /> Lưu & Lấy Proxy
                     </button>
                 </div>

                 {/* Pool Status */}
                 <div className="bg-[#1e293b]/50 border border-slate-700/50 rounded-lg p-4 flex items-center gap-3">
                     <Server className="w-5 h-5 text-indigo-400" />
                     <div>
                         <div className="text-[10px] font-bold text-slate-500 uppercase">TRẠNG THÁI POOL</div>
                         <div className="text-sm font-medium text-slate-300">Chưa có proxy nào trong Pool</div>
                     </div>
                 </div>

                 {/* IP Check Info */}
                 <div className="grid grid-cols-2 gap-4">
                     <div className="bg-[#020617] border border-slate-800 rounded-lg p-3">
                         <div className="text-[10px] text-slate-500 mb-1">IP Máy (Gốc):</div>
                         <div className="text-sm font-bold text-white font-mono">Chưa kiểm tra</div>
                     </div>
                     <div className="bg-[#020617] border border-slate-800 rounded-lg p-3">
                         <div className="text-[10px] text-slate-500 mb-1">IP Tool (Proxy):</div>
                         <div className="text-sm font-bold text-slate-500 font-mono">Chưa kiểm tra</div>
                     </div>
                 </div>

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
            {/* Provider Toggle Button */}
            <div className={`flex items-center p-1 rounded-lg border ${bgColor.isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700'}`}>
               <button
                  onClick={() => setCurrentProvider('gemini')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${currentProvider === 'gemini' 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-500'}`}
               >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gemini</span>
               </button>
               <button
                  onClick={() => setCurrentProvider('elevenlabs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${currentProvider === 'elevenlabs' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-500'}`}
               >
                  <Activity className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ElevenLabs</span>
               </button>
            </div>

            <div className="w-px h-6 bg-slate-700/50 mx-1 hidden sm:block"></div>

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

            {/* Proxy Button */}
            <button 
              onClick={() => setShowProxyModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold ${bgColor.isLight ? 'border-slate-300 bg-white/50 hover:bg-white text-slate-700' : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'}`}
              title="Cấu hình Proxy (ElevenLabs)"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Proxy</span>
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
              <span className="hidden sm:inline">Cấu hình API</span>
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
                 selectedProvider={currentProvider}
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
               <div className={`h-full flex flex-col items-center justify-start pt-32 pb-32 min-h-[500px] border-2 border-dashed rounded-2xl p-8 text-center transition-opacity duration-300 ${status === GenerationStatus.GENERATING ? 'opacity-50' : 'opacity-100'} ${bgColor.isLight ? 'border-slate-300 bg-white/40' : 'border-slate-800 bg-slate-900/30'}`}>
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
                      Chọn Nhà cung cấp ở trên (Gemini/ElevenLabs), ngôn ngữ, giọng đọc và nhập văn bản để bắt đầu.
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

      <footer className={`mt-8 py-4 border-t text-center ${bgColor.isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-slate-400'}`}>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm">
           <span>&copy; 2026 studyai86.online. All rights reserved.</span>
           <span className="hidden sm:inline opacity-20">|</span>
           <a 
             href="https://www.facebook.com/deshunvn/" 
             target="_blank" 
             rel="noopener noreferrer"
             className={`flex items-center gap-2 transition-colors ${bgColor.isLight ? 'hover:text-brand-600' : 'hover:text-white'}`}
           >
             <Facebook className="w-4 h-4" />
             Liên hệ
           </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
