import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TTSConfig, TTSProvider, SavedScript } from '../types';
import { VOICES, TONES, STYLES, LANGUAGES, PROVIDERS, GEMINI_MODELS, VoiceOption } from '../constants';
import { generateSpeechGemini } from '../services/geminiService';
import { generateSpeechEdge } from '../services/edgeService';
import { Sparkles, Edit3, ChevronRight, Sliders, MessageSquare, Play, Pause, Loader2, HelpCircle, Globe, ChevronDown, ChevronUp, Mic, Info } from 'lucide-react';

interface ScriptFormProps {
  onGenerateAudio: (config: TTSConfig) => void;
  isGenerating: boolean;
  loadedScript?: SavedScript | null;
  selectedProvider: TTSProvider;
  onProviderChange: (provider: TTSProvider) => void;
}

const TooltipLabel = ({ 
  label, 
  icon: Icon, 
  tooltip, 
  colorClass = "text-slate-500",
  placement = "top"
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
    
    <div className={`absolute left-0 ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} hidden group-hover:block w-64 p-3 bg-slate-950/95 backdrop-blur-sm border border-slate-700 text-slate-300 text-xs rounded-xl shadow-2xl z-50 animate-fade-in pointer-events-none leading-relaxed`}>
       {tooltip}
       <div className={`absolute left-4 ${placement === 'top' ? '-bottom-1 border-r border-b' : '-top-1 border-t border-l'} w-2 h-2 bg-slate-950 border-slate-700 transform rotate-45`}></div>
    </div>
  </div>
);

export const ScriptForm: React.FC<ScriptFormProps> = ({ 
  onGenerateAudio, 
  isGenerating,
  loadedScript,
  selectedProvider,
  onProviderChange
}) => {
  const provider = selectedProvider;
  const [language, setLanguage] = useState(LANGUAGES[0].code);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(""); 
  const [tone, setTone] = useState(TONES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [instructions, setInstructions] = useState("");
  const [geminiModel, setGeminiModel] = useState(GEMINI_MODELS[0].id);
  
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (loadedScript) {
      setLanguage(loadedScript.language);
      setText(loadedScript.text);
      setTone(loadedScript.tone);
      setStyle(loadedScript.style);
      setInstructions(loadedScript.instructions || "");
      if (loadedScript.geminiModel) setGeminiModel(loadedScript.geminiModel);
      
      const voiceExists = VOICES.some(v => v.id === loadedScript.voice);
      if (voiceExists) {
        setVoice(loadedScript.voice);
      }
    }
  }, [loadedScript]);

  const filteredVoices = VOICES.filter(v => {
    if (v.provider !== provider) return false;
    
    if (language === 'vi-VN') return v.lang === 'vi-VN';
    if (language === 'en-US') return v.lang === 'en-US';
    if (language === 'en-GB') return v.lang === 'en-GB';
    if (language === 'ja-JP') return v.lang === 'ja-JP';
    if (language === 'ko-KR') return v.lang === 'ko-KR';
    if (language === 'fr-FR') return v.lang === 'fr-FR';
    if (language === 'es-ES') return v.lang === 'es-ES';
    if (language === 'de-DE') return v.lang === 'de-DE';
    if (language === 'zh-CN') return v.lang === 'zh-CN';
    
    return v.lang === 'en-US'; 
  });

  const groupedVoices = useMemo(() => {
      const groups: Record<string, VoiceOption[]> = {};
      
      filteredVoices.forEach(v => {
          let label = "Khác";
          const langObj = LANGUAGES.find(l => l.code === v.lang);
          label = langObj ? langObj.name : "Khác";

          if (!groups[label]) groups[label] = [];
          groups[label].push(v);
      });

      return groups;
  }, [filteredVoices]);

  useEffect(() => {
    const isVoiceValid = filteredVoices.some(v => v.id === voice);
    if (!isVoiceValid && filteredVoices.length > 0) {
       setVoice(filteredVoices[0].id);
    }
    stopPreview();
  }, [provider, language]);

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
        case 'fr-FR':
            return "Bonjour, ceci est un aperçu de ma voix. Je suis prêt à vous aider à créer un contenu incroyable.";
        case 'es-ES':
            return "Hola, esta es una vista previa de mi voz. Estoy listo para ayudarte a crear contenido increíble.";
        case 'de-DE':
            return "Hallo, dies ist eine Vorschau meiner Stimme. Ich bin bereit, Ihnen bei der Erstellung fantastischer Inhalte zu helfen.";
        case 'zh-CN':
            return "你好，这是我的声音预览。我准备好帮助你创造精彩的内容了。";
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

    setIsPreviewLoading(true);
    
    const previewConfig: TTSConfig = {
        text: getPreviewText(language),
        voice: voice,
        provider: provider,
        language: language,
        tone: tone,
        style: style,
        isPreview: true,
        geminiModel: geminiModel
    };

    try {
        let result;
        if (provider === 'edge') {
            result = await generateSpeechEdge(previewConfig);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stopPreview();
    if (!text.trim()) return;

    onGenerateAudio({
      text,
      voice,
      provider,
      language,
      tone,
      style,
      instructions,
      geminiModel
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => onProviderChange('gemini')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${provider === 'gemini' ? 'bg-slate-700 text-brand-400 border-b-2 border-brand-400' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'}`}
        >
          <Sparkles className="w-4 h-4" />
          Gemini TTS
        </button>
        <button
          onClick={() => onProviderChange('edge')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${provider === 'edge' ? 'bg-slate-700 text-brand-400 border-b-2 border-brand-400' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'}`}
        >
          <Mic className="w-4 h-4" />
          Edge TTS
        </button>
      </div>

      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-slate-200">
             Cấu hình {provider === 'gemini' ? 'Gemini' : 'Edge TTS'}
          </h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-brand-500/20 text-brand-400">
            {provider}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
        
        {provider === 'gemini' ? (
          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 p-3 rounded-xl flex items-start gap-3 text-sm font-medium animate-fade-in">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Các bạn cần API để tạo giọng bằng Gemini TTS.</p>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-xl flex items-start gap-3 text-sm font-medium animate-fade-in">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Các bạn không cần API để tạo giọng bằng Edge TTS.</p>
          </div>
        )}

        {provider === 'gemini' && (
          <div className="space-y-2 animate-fade-in">
            <TooltipLabel 
              label="Gemini TTS Model"
              icon={Sparkles}
              colorClass="text-brand-400"
              tooltip="Chọn phiên bản mô hình Gemini. 'Flash' cho tốc độ cực nhanh, 'Pro' cho chất lượng âm thanh và độ biểu cảm cao hơn."
            />
            <div className="relative">
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-brand-500/30 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 cursor-pointer text-sm"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="w-4 h-4 text-brand-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
            </div>
          </div>
        )}

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

        <div className="space-y-4">
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                  <TooltipLabel 
                     label="Chọn Giọng đọc"
                     tooltip="Chọn nhân vật sẽ đọc văn bản của bạn."
                  />
              </div>
              
              <div className="flex gap-2 animate-fade-in">
                  <div className="relative flex-1">
                  <select 
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 cursor-pointer text-sm"
                  >
                      {Object.entries(groupedVoices).map(([groupName, voices]) => (
                          <optgroup key={groupName} label={groupName} className="bg-slate-800 text-slate-400 font-bold">
                              {(voices as VoiceOption[]).map(v => (
                                  <option key={v.id} value={v.id} className="text-white font-normal bg-slate-900">
                                      {v.name} ({v.gender}, {v.traits})
                                  </option>
                              ))}
                          </optgroup>
                      ))}
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                  </div>
                  
                  <button
                      type="button"
                      onClick={handlePreviewToggle}
                      disabled={isGenerating}
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
              </div>
            </div>

            {provider === 'gemini' && (
              <div className="border border-slate-700 bg-slate-900/30 rounded-xl overflow-hidden">
                  <button 
                      type="button"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors hover:bg-slate-800"
                  >
                      <span className="flex items-center gap-2">
                          <Sliders className="w-4 h-4" /> Tùy chỉnh nâng cao
                      </span>
                      {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAdvancedSettings && (
                      <div className="p-4 border-t border-slate-700 space-y-4 animate-slide-up">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      </div>
                  )}
              </div>
            )}

            <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Kịch bản
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  {text.trim() ? text.trim().split(/\s+/).length : 0} từ • {text.length} ký tự
                </span>
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
                  {provider === 'edge' ? <Mic className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  <span>Tạo bằng {provider === 'edge' ? 'Edge TTS' : 'Gemini'}</span>
                </>
              )}
            </button>
        </div>
      </form>
    </div>
  );
};
