
import React, { useState, useRef, useEffect } from 'react';
import { TTSConfig, TTSProvider, SavedScript } from '../types';
import { VOICES, TONES, STYLES, LANGUAGES, PROVIDERS, ELEVENLABS_MODELS, VoiceOption } from '../constants';
import { generateSpeechGemini } from '../services/geminiService';
import { generateSpeechElevenLabs, createVoiceElevenLabs, getActiveElevenLabsKey } from '../services/elevenLabsService';
import { Sparkles, Edit3, ChevronRight, Sliders, MessageSquare, Activity, Fingerprint, Play, Pause, Loader2, Zap, HelpCircle, Globe, Info, Upload, CheckCircle2, AlertTriangle, X, ArrowRight } from 'lucide-react';

interface ScriptFormProps {
  onGenerateAudio: (config: TTSConfig) => void;
  isGenerating: boolean;
  loadedScript?: SavedScript | null; // Prop to receive script from library
}

// Helper Component for Labels with Tooltips
const TooltipLabel = ({ 
  label, 
  icon: Icon, 
  tooltip, 
  colorClass = "text-slate-500",
  placement = "top" // 'top' (popup goes up) or 'bottom' (popup goes down)
}: { 
  label: string, 
  icon?: any, 
  tooltip: string,
  colorClass?: string,
  placement?: 'top' | 'bottom'
}) => (
  <div className="group relative flex items-center gap-2 mb-2 w-fit cursor-help">
    <label className={`text-xs uppercase tracking-wider font-bold flex items-center gap-2 ${colorClass}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      <HelpCircle className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
    </label>
    
    {/* Tooltip Content */}
    <div className={`absolute left-0 ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} hidden group-hover:block w-64 p-3 bg-slate-950/95 backdrop-blur-sm border border-slate-700 text-slate-300 text-xs rounded-xl shadow-2xl z-50 animate-fade-in pointer-events-none leading-relaxed`}>
       {tooltip}
       {/* Arrow */}
       <div className={`absolute left-4 ${placement === 'top' ? '-bottom-1 border-r border-b' : '-top-1 border-t border-l'} w-2 h-2 bg-slate-950 border-slate-700 transform rotate-45`}></div>
    </div>
  </div>
);

export const ScriptForm: React.FC<ScriptFormProps> = ({ 
  onGenerateAudio, 
  isGenerating,
  loadedScript
}) => {
  const [provider, setProvider] = useState<TTSProvider>('gemini');
  const [language, setLanguage] = useState(LANGUAGES[0].code); // Default Vietnamese
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(""); 
  const [customVoiceId, setCustomVoiceId] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [instructions, setInstructions] = useState("");
  const [elevenLabsModel, setElevenLabsModel] = useState(ELEVENLABS_MODELS[0].id);
  
  // Clone Voice State
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneApiKey, setCloneApiKey] = useState("");
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [manualVoiceId, setManualVoiceId] = useState(""); // For manual entry in clone form
  
  // Store newly created voices in session state so they appear in dropdown
  const [createdVoices, setCreatedVoices] = useState<VoiceOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Audio State
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load script from library when prop changes
  useEffect(() => {
    if (loadedScript) {
      setProvider(loadedScript.provider);
      setLanguage(loadedScript.language);
      setText(loadedScript.text);
      setTone(loadedScript.tone);
      setStyle(loadedScript.style);
      setInstructions(loadedScript.instructions || "");
      if (loadedScript.elevenLabsModel) {
          setElevenLabsModel(loadedScript.elevenLabsModel);
      }
      
      // Handle Voice ID
      const voiceExists = VOICES.some(v => v.id === loadedScript.voice);
      if (voiceExists) {
        setVoice(loadedScript.voice);
        setCustomVoiceId("");
      } else if (loadedScript.provider === 'elevenlabs') {
        setVoice('custom_input');
        setCustomVoiceId(loadedScript.voice);
      }
    }
  }, [loadedScript]);

  // Try to autofill clone key if available from settings (only strictly if user wants, but here we keep it manual for safety/clarity as per design)
  useEffect(() => {
      // Optional: if needed to pre-fill from stored keys
      // const storedKey = getActiveElevenLabsKey();
      // if (storedKey) setCloneApiKey(storedKey);
  }, []);

  // Filter voices based on Provider and Language
  // Merge static voices with any newly created voices in this session
  const allVoices = [...VOICES, ...createdVoices];
  
  const filteredVoices = allVoices.filter(v => {
    // Basic provider filter
    if (v.provider !== provider) return false;
    
    // ElevenLabs logic
    if (provider === 'elevenlabs') {
      // Show "custom_input" always for ElevenLabs
      if (v.id === 'custom_input') return true;
      
      // If voice is marked as 'multi', show it regardless of language selection 
      // (Because ElevenLabs multilingual models make these voices speak any language)
      if (v.lang === 'multi' || v.lang === 'all') return true;
      
      // Fallback: If voice has specific language tag, match it
      return v.lang === language;
    }

    // Gemini logic: Map simple language to voice filtering
    if (language === 'vi-VN') return v.lang === 'vi-VN';
    if (language === 'en-US') return v.lang === 'en-US';
    if (language === 'en-GB') return v.lang === 'en-GB';
    if (language === 'ja-JP') return v.lang === 'ja-JP';
    if (language === 'ko-KR') return v.lang === 'ko-KR';
    
    return v.lang === 'en-US'; 
  });

  // Reset voice selection when provider or language changes
  useEffect(() => {
    const isVoiceValid = filteredVoices.some(v => v.id === voice);
    if (!isVoiceValid && filteredVoices.length > 0) {
       setVoice(filteredVoices[0].id);
    }
    
    if (provider !== 'elevenlabs') {
        setCustomVoiceId("");
        setShowCloneForm(false);
    }
    stopPreview();
  }, [provider, language]);

  // Stop preview when voice changes
  useEffect(() => {
    stopPreview();
  }, [voice]);

  const stopPreview = () => {
    if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
    }
    setIsPlayingPreview(false);
    setIsPreviewLoading(false);
  };

  const getPreviewText = (langCode: string) => {
    switch (langCode) {
        case 'en-US':
        case 'en-GB':
            return "Hello, this is my voice preview. I'm ready to help you create amazing content.";
        case 'ja-JP':
            return "こんにちは、これは私の声のプレビューです。素敵なコンテンツ作りをお手伝いします。";
        case 'ko-KR':
            return "안녕하세요, 제 목소리 미리듣기입니다. 멋진 콘텐츠를 함께 만들어봐요.";
        case 'vi-VN':
        default:
            return "Xin chào, đây là giọng đọc mẫu của tôi. Rất vui được hỗ trợ bạn tạo nội dung.";
    }
  };

  const handlePreviewToggle = async () => {
    if (isPlayingPreview || isPreviewLoading) {
        stopPreview();
        return;
    }

    let finalVoice = voice;
    if (provider === 'elevenlabs' && voice === 'custom_input') {
        if (!customVoiceId.trim()) {
            alert("Vui lòng nhập Voice ID để nghe thử.");
            return;
        }
        finalVoice = customVoiceId.trim();
    }

    setIsPreviewLoading(true);
    
    const previewConfig: TTSConfig = {
        text: getPreviewText(language),
        voice: finalVoice,
        provider: provider,
        language: language,
        tone: tone,
        style: style,
        isPreview: true,
        elevenLabsModel: elevenLabsModel // Use selected model for preview too
    };

    try {
        let result;
        if (provider === 'elevenlabs') {
            result = await generateSpeechElevenLabs(previewConfig);
        } else {
            result = await generateSpeechGemini(previewConfig);
        }

        if (result && result.audioUrl) {
            if (!previewAudioRef.current) {
                previewAudioRef.current = new Audio();
                previewAudioRef.current.onended = () => {
                    setIsPlayingPreview(false);
                    setIsPreviewLoading(false);
                };
            }
            previewAudioRef.current.src = result.audioUrl;
            await previewAudioRef.current.play();
            setIsPlayingPreview(true);
        }
    } catch (error: any) {
        console.error("Preview failed", error);
        alert(`Không thể phát nghe thử: ${error.message}`);
    } finally {
        setIsPreviewLoading(false);
    }
  };

  // --- CLONE HANDLERS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setCloneFile(e.target.files[0]);
      }
  };

  const handleCloneSubmit = async () => {
      if (!cloneName) return alert("Vui lòng đặt tên cho giọng mới.");
      if (!cloneFile) return alert("Vui lòng tải lên file mẫu.");
      
      // Use provided key, or fallback to system key if empty (though UI implies required)
      const finalKey = cloneApiKey || getActiveElevenLabsKey();
      if (!finalKey) return alert("Vui lòng nhập API Key (Paid Tier) để clone giọng.");

      setIsCloning(true);
      try {
          const newVoiceId = await createVoiceElevenLabs(cloneName, [cloneFile], finalKey);
          
          alert(`Clone thành công! Giọng đã được thêm vào thư viện ElevenLabs của bạn.\nVoice ID: ${newVoiceId}`);
          
          // Add to local session list so user can select it immediately without manual ID entry
          const newVoiceOption: VoiceOption = {
            id: newVoiceId,
            name: `(Clone) ${cloneName}`,
            gender: "Custom",
            traits: "Cloned",
            provider: "elevenlabs",
            lang: "multi" // Assume multilingual for cloned voices
          };
          
          setCreatedVoices(prev => [newVoiceOption, ...prev]);
          
          // Auto select the new voice
          setVoice(newVoiceId);
          setCustomVoiceId(""); // Clear custom ID field as we are now selecting from list
          setShowCloneForm(false);
          setCloneName("");
          setCloneFile(null);
          setCloneApiKey(""); // Clear key for security

      } catch (error: any) {
          alert(`Lỗi clone giọng: ${error.message}`);
      } finally {
          setIsCloning(false);
      }
  };

  const handleUseManualVoiceId = () => {
      if (!manualVoiceId.trim()) return;
      setVoice("custom_input");
      setCustomVoiceId(manualVoiceId.trim());
      setShowCloneForm(false); // Close modal
      setManualVoiceId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stopPreview();
    if (!text.trim()) return;

    let finalVoice = voice;
    if (provider === 'elevenlabs' && voice === 'custom_input') {
        if (!customVoiceId.trim()) {
            alert("Vui lòng nhập Voice ID của ElevenLabs.");
            return;
        }
        finalVoice = customVoiceId.trim();
    }

    onGenerateAudio({
      text,
      voice: finalVoice,
      provider,
      language,
      tone,
      style,
      instructions,
      elevenLabsModel
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-slate-200">Cấu hình Studio</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
        
        {/* Provider Selection */}
        <div>
          <TooltipLabel 
            label="Nhà cung cấp AI" 
            tooltip="Chọn công nghệ lõi để tạo giọng nói. Gemini (Google) miễn phí và tốc độ cao. ElevenLabs trả phí nhưng cho chất lượng giọng đọc siêu thực và cảm xúc."
            placement="bottom" 
          />
          <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-700">
            {PROVIDERS.map((p) => (
               <button
                 key={p.id}
                 type="button"
                 onClick={() => {
                   setProvider(p.id as TTSProvider);
                 }}
                 className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                   provider === p.id 
                   ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' 
                   : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                 }`}
               >
                 {p.id === 'gemini' ? <Sparkles className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                 {p.name}
               </button>
            ))}
          </div>
        </div>

        {/* ElevenLabs Model Selection */}
        {provider === 'elevenlabs' && (
           <div className="space-y-2 animate-fade-in">
              <TooltipLabel 
                label="ElevenLabs Model"
                icon={Zap}
                colorClass="text-indigo-400"
                tooltip="Chọn phiên bản mô hình AI. 'Multilingual v2' cho chất lượng tốt nhất (hỗ trợ Tiếng Việt tốt). 'Flash/Turbo' ưu tiên tốc độ phản hồi nhanh."
              />
              <div className="relative">
                <select
                  value={elevenLabsModel}
                  onChange={(e) => setElevenLabsModel(e.target.value)}
                  className="w-full appearance-none bg-slate-900 border border-indigo-500/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer text-sm"
                >
                  {ELEVENLABS_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 text-indigo-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
           </div>
        )}

        {/* Language Selection */}
        <div className="space-y-2">
           <TooltipLabel 
             label="Ngôn ngữ đầu vào"
             icon={Globe}
             tooltip="Chọn ngôn ngữ của văn bản bạn muốn chuyển thành giọng nói. Hệ thống sẽ tự động lọc danh sách giọng đọc phù hợp với ngôn ngữ này."
           />
           <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 cursor-pointer text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
           </div>
        </div>

        {/* Voice Selection */}
        <div className="space-y-4">
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                  <TooltipLabel 
                     label="Chọn Giọng đọc"
                     tooltip="Chọn nhân vật sẽ đọc văn bản của bạn. Với ElevenLabs, các giọng 'Multi' có thể đọc trôi chảy nhiều ngôn ngữ (bao gồm Tiếng Việt)."
                  />
                  {provider === 'elevenlabs' && (
                      <button 
                        type="button"
                        onClick={() => setShowCloneForm(!showCloneForm)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors flex items-center gap-1 ${showCloneForm ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                      >
                         <Fingerprint className="w-3 h-3" />
                         {showCloneForm ? 'Đóng Clone' : 'Tạo giọng mới'}
                      </button>
                  )}
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select 
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 cursor-pointer text-sm"
                  >
                    {filteredVoices.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.id === 'custom_input' ? v.name : `${v.name} (${v.gender}, ${v.traits})`}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
                
                {voice !== 'custom_input' && (
                  <button
                    type="button"
                    onClick={handlePreviewToggle}
                    disabled={isGenerating} // Disable if main generation is running
                    className={`shrink-0 w-12 rounded-xl flex items-center justify-center transition-all ${
                        isPreviewLoading
                        ? 'bg-brand-600/50 cursor-wait text-white'
                        : isPlayingPreview 
                        ? 'bg-brand-500 text-white animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.5)]' 
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                    }`}
                    title="Nghe thử giọng này (Tạo câu thoại mẫu ngay lập tức)"
                  >
                    {isPreviewLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPlayingPreview ? (
                        <Pause className="w-5 h-5" />
                    ) : (
                        <Play className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
              
              {/* --- INSTANT CLONE FORM --- */}
              {provider === 'elevenlabs' && showCloneForm && (
                  <div className="mt-3 p-4 bg-slate-900 border border-indigo-500/50 rounded-xl animate-slide-up space-y-4 relative overflow-hidden">
                      {/* Close button inside form */}
                      <button 
                         type="button" 
                         onClick={() => setShowCloneForm(false)}
                         className="absolute top-2 right-2 text-slate-500 hover:text-white"
                      >
                          <X className="w-4 h-4" />
                      </button>

                      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 flex gap-3 items-start">
                          <Zap className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                          <div className="text-[10px] text-yellow-200/80 leading-relaxed">
                             <strong className="text-yellow-400">Instant Clone (Paid):</strong> Tạo giọng mới từ mẫu (cần gói Starter/Creator). 
                             Nếu dùng gói Free, hãy nhập Voice ID có sẵn vào ô bên dưới thay vì tạo mới.
                          </div>
                      </div>

                      {/* Clone Name */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Tên giọng mới</label>
                          <input 
                              type="text" 
                              value={cloneName}
                              onChange={(e) => setCloneName(e.target.value)}
                              placeholder="Đặt tên cho giọng clone..."
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                          />
                      </div>

                      {/* Clone API Key */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-indigo-400 uppercase">Key kích hoạt clone (Bắt buộc nếu cần)</label>
                          <input 
                              type="password" 
                              value={cloneApiKey}
                              onChange={(e) => setCloneApiKey(e.target.value)}
                              placeholder="Nhập API Key của bạn (Starter/Creator)..."
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                          />
                          <p className="text-[9px] text-slate-600">Nhập key riêng của bạn để tạo giọng. Nếu không nhập, hệ thống sẽ dùng key chung.</p>
                      </div>

                      {/* File Upload */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              Tải lên giọng tham khảo <HelpCircle className="w-3 h-3 text-slate-600" />
                          </label>
                          <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
                          >
                              {cloneFile ? (
                                  <div className="text-center">
                                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                      <p className="text-xs text-white font-medium">{cloneFile.name}</p>
                                      <p className="text-[10px] text-slate-500">{(cloneFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                              ) : (
                                  <div className="text-center text-slate-500">
                                      <Upload className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                      <p className="text-xs">Nhấn để tải lên mẫu giọng nói</p>
                                      <p className="text-[9px] opacity-70">WAV hoặc MP3 (Tối đa 5MB)</p>
                                  </div>
                              )}
                              <input 
                                  ref={fileInputRef}
                                  type="file" 
                                  accept="audio/*" 
                                  className="hidden" 
                                  onChange={handleFileChange}
                              />
                          </div>
                      </div>

                      <button 
                          type="button"
                          onClick={handleCloneSubmit}
                          disabled={isCloning}
                          className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
                      >
                          {isCloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                          {isCloning ? 'Đang tạo giọng...' : 'Sao chép giọng'}
                      </button>

                      {/* Divider for Manual ID */}
                      <div className="flex items-center gap-3 my-2">
                          <div className="h-px bg-slate-700 flex-1"></div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">HOẶC DÙNG ID CÓ SẴN (FREE)</span>
                          <div className="h-px bg-slate-700 flex-1"></div>
                      </div>

                      {/* Manual Voice ID Input inside Clone Form */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Nhập Voice ID (Nếu không Clone)</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  value={manualVoiceId}
                                  onChange={(e) => setManualVoiceId(e.target.value)}
                                  placeholder="Ví dụ: pNInz6obpgDQGcFmaJgB"
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none font-mono"
                              />
                              <button 
                                type="button"
                                onClick={handleUseManualVoiceId}
                                disabled={!manualVoiceId.trim()}
                                className="px-3 py-2 bg-slate-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  Sử dụng
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Custom Voice ID Input (Original Location - Show if not in Clone Mode but custom input selected) */}
              {provider === 'elevenlabs' && voice === 'custom_input' && !showCloneForm && (
                <div className="animate-slide-up mt-2">
                    <TooltipLabel 
                       label="Nhập Voice ID"
                       icon={Fingerprint}
                       colorClass="text-indigo-400"
                       tooltip="Nhập ID giọng nói tùy chỉnh từ thư viện Voice Lab của ElevenLabs."
                    />
                    <input 
                        type="text"
                        value={customVoiceId}
                        onChange={(e) => setCustomVoiceId(e.target.value)}
                        placeholder="Paste Voice ID từ ElevenLabs..."
                        className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                        Bạn có thể lấy ID từ <a href="https://elevenlabs.io/app/voice-lab" target="_blank" className="underline hover:text-indigo-400">Voice Lab</a>
                    </p>
                </div>
              )}
            </div>

          {/* Hide these sections when Clone Form is Active */}
          {(!showCloneForm) && (
            <>
                {/* Tone & Style - Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Tone */}
                    <div className="space-y-2">
                      <TooltipLabel 
                         label="Tông giọng"
                         tooltip="Điều chỉnh cảm xúc chủ đạo của giọng nói. 'Tiêu chuẩn' là trung tính. 'Cảm xúc' hoặc 'Thì thầm' phù hợp cho kể chuyện."
                      />
                      <div className="relative">
                        <select 
                          value={tone}
                          onChange={(e) => setTone(e.target.value)}
                          className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 cursor-pointer text-sm"
                        >
                          {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                      </div>
                    </div>

                    {/* Style */}
                    <div className="space-y-2">
                      <TooltipLabel 
                         label="Phong cách nói"
                         tooltip="Điều chỉnh cách diễn đạt. 'Tin tức' sẽ trang trọng, nhanh. 'Kể chuyện' sẽ chậm rãi, nhấn nhá. 'Hội thoại' sẽ tự nhiên hơn."
                      />
                      <div className="relative">
                        <select 
                          value={style}
                          onChange={(e) => setStyle(e.target.value)}
                          className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 cursor-pointer text-sm"
                        >
                          {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                </div>

                {/* Custom Instructions */}
                <div className="space-y-2">
                    <TooltipLabel 
                       label="Hướng dẫn bổ sung"
                       icon={MessageSquare}
                       tooltip="Nhập các chỉ dẫn cụ thể cho AI bằng tiếng Anh hoặc Việt. Ví dụ: 'Đọc thật chậm rãi', 'Ngắt nghỉ dài sau mỗi câu', 'Giọng vui vẻ phấn khởi'."
                    />
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder={"vd: Ngừng 2 giây sau mỗi câu..."}
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all text-sm"
                    />
                </div>

                {/* Text Editor */}
                <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      Kịch bản
                    </label>
                    <span className="text-xs text-slate-500 font-mono">{text.length} ký tự</span>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Nhập văn bản ${LANGUAGES.find(l=>l.code===language)?.name} bạn muốn chuyển thành giọng nói...`}
                    className="w-full flex-1 bg-slate-900 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none font-mono text-sm leading-relaxed custom-scrollbar"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating || !text.trim()}
                  className={`
                    w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all
                    flex items-center justify-center gap-2 mt-auto
                    ${isGenerating || !text.trim()
                      ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                      : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 hover:shadow-brand-500/25'}
                  `}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      {provider === 'gemini' ? <Sparkles className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                      <span>{`Tạo bằng ${provider === 'gemini' ? 'Gemini' : 'ElevenLabs'}`}</span>
                    </>
                  )}
                </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
