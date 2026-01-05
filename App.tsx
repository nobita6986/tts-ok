
import React, { useState, useEffect } from 'react';
import { ScriptForm } from './components/ScriptForm';
import { ScriptOutput } from './components/ScriptOutput';
import { generateSpeech, getStoredApiKey, setStoredApiKey } from './services/geminiService';
import { TTSConfig, GeneratedAudio, GenerationStatus } from './types';
import { APP_BACKGROUNDS } from './constants';
import { Mic, Sparkles, Volume2, Palette, Settings, Key, X, Eye, EyeOff, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

function App() {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [result, setResult] = useState<GeneratedAudio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState(APP_BACKGROUNDS[1]); // Mặc định: Deep Emerald
  
  // API Key State
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKey, setApiKey] = useState(getStoredApiKey() || "");
  const [showKey, setShowKey] = useState(false);
  const [hasKeyConfigured, setHasKeyConfigured] = useState(!!(getStoredApiKey() || process.env.API_KEY));

  const handleGenerateAudio = async (config: TTSConfig) => {
    if (!hasKeyConfigured) {
      setShowApiModal(true);
      setError("Vui lòng cấu hình Gemini API Key trước khi sử dụng.");
      return;
    }

    setStatus(GenerationStatus.GENERATING);
    setError(null);
    
    try {
      const { audioUrl, imagePrompt } = await generateSpeech(config);
      setResult({
        audioUrl,
        imagePrompt,
        text: config.text,
        voice: config.voice,
        timestamp: Date.now()
      });
      setStatus(GenerationStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tạo giọng nói.");
      setStatus(GenerationStatus.ERROR);
      // Nếu lỗi là 401 hoặc liên quan đến API key, mở modal
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

  const saveApiKey = () => {
    setStoredApiKey(apiKey.trim());
    setHasKeyConfigured(!!apiKey.trim() || !!process.env.API_KEY);
    setShowApiModal(false);
    setError(null);
  };

  return (
    <div 
      className="min-h-screen pb-12 font-sans transition-colors duration-700"
      style={{ backgroundColor: bgColor.value, color: bgColor.isLight ? '#1e293b' : '#e2e8f0' }}
    >
      {/* API Configuration Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/10 rounded-lg">
                  <Key className="w-5 h-5 text-brand-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Cấu hình Gemini API</h2>
              </div>
              <button onClick={() => setShowApiModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-slate-400 leading-relaxed">
                  Ứng dụng sử dụng mô hình <strong>Gemini 2.5 Flash</strong> để xử lý văn bản và tổng hợp giọng nói. Bạn cần cung cấp API Key từ Google AI Studio.
                </p>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Lấy API Key tại đây <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gemini API Key</label>
                <div className="relative">
                  <input 
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Dán API Key của bạn vào đây..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white focus:ring-2 focus:ring-brand-500 transition-all text-sm font-mono"
                  />
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {apiKey.length > 0 && apiKey.length < 20 && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> API Key có vẻ quá ngắn.
                  </p>
                )}
              </div>

              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-xs text-slate-500">
                  Key được lưu an toàn tại <strong>localStorage</strong> trình duyệt của bạn và chỉ được gửi tới API chính thức của Google.
                </p>
              </div>

              <button 
                onClick={saveApiKey}
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

             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-brand-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                  <Mic className="w-5 h-5" />
                </div>
                <span className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${bgColor.isLight ? 'from-slate-800 to-slate-500' : 'from-white to-slate-400'}`}>
                  App Tạo và Clone Giọng Nói
                </span>
             </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowApiModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold ${
                hasKeyConfigured 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 animate-pulse'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{hasKeyConfigured ? 'Đã cấu hình API' : 'Chưa nhập API Key'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-brand-400 bg-brand-900/20 px-3 py-1 rounded-full border border-brand-500/20">
               <span className="animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Gemini 2.5</span>
               </span>
            </div>
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
          <div className={`lg:col-span-5 flex flex-col transition-all duration-500 ${status === GenerationStatus.SUCCESS ? 'hidden xl:flex' : ''}`}>
               <ScriptForm 
                 onGenerateAudio={handleGenerateAudio}
                 isGenerating={status === GenerationStatus.GENERATING}
               />
          </div>

          {/* Right Column: Output or Placeholder */}
          <div className={`lg:col-span-7 w-full transition-all duration-500`}>
            {status === GenerationStatus.SUCCESS && result ? (
              <ScriptOutput 
                result={result} 
                onReset={handleReset} 
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
                      Chọn giọng nói, xác định tông và phong cách, sau đó nhập văn bản để tạo giọng nói sống động ngay lập tức.
                    </p>
                    {!hasKeyConfigured && (
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
