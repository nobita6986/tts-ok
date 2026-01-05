
import React, { useState, useRef } from 'react';
import { TTSConfig } from '../types';
import { VOICES, TONES, STYLES } from '../constants';
import { Mic2, Sparkles, Edit3, ChevronRight, Sliders, MessageSquare, Upload, X, FileAudio, Info, Mic } from 'lucide-react';

interface ScriptFormProps {
  onGenerateAudio: (config: TTSConfig) => void;
  isGenerating: boolean;
}

type Mode = 'preset' | 'clone';

export const ScriptForm: React.FC<ScriptFormProps> = ({ 
  onGenerateAudio, 
  isGenerating 
}) => {
  const [mode, setMode] = useState<Mode>('preset');
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(VOICES[0].id);
  const [tone, setTone] = useState(TONES[0]);
  const [style, setStyle] = useState(STYLES[0]);
  const [instructions, setInstructions] = useState("");
  
  // Clone State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Tệp quá lớn. Vui lòng tải lên mẫu dưới 5MB.");
        return;
      }
      
      setAudioFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        // Strip the Data URI prefix to get raw base64
        const base64 = result.split(',')[1];
        setAudioBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAudioFile(null);
    setAudioBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (mode === 'clone' && !audioBase64) {
      alert("Vui lòng tải lên mẫu giọng nói để sao chép.");
      return;
    }

    onGenerateAudio({
      text,
      voice: mode === 'clone' ? 'Giọng sao chép' : voice,
      tone,
      style,
      instructions,
      isClone: mode === 'clone',
      audioSample: audioBase64 || undefined,
      audioMimeType: audioFile?.type
    });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-slate-200">Cấu hình Studio Giọng nói</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
        
        {/* Mode Toggle */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setMode('preset')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'preset' 
                ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            Giọng có sẵn
          </button>
          <button
            type="button"
            onClick={() => setMode('clone')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              mode === 'clone' 
                ? 'bg-slate-700 text-white shadow-sm ring-1 ring-slate-600' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic2 className="w-4 h-4" />
            Sao chép giọng (Clone)
          </button>
        </div>

        {/* Voice Selection or Upload */}
        <div className="space-y-4">
          {mode === 'preset' ? (
            <div className="space-y-2 animate-fade-in">
              <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Chọn Hồ sơ Giọng nói</label>
              <div className="relative">
                <select 
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full appearance-none bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-500 cursor-pointer text-sm"
                >
                  {VOICES.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.gender}, {v.traits})
                    </option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
               <div className="bg-indigo-900/20 border border-indigo-500/20 p-3 rounded-lg flex gap-3 text-xs text-indigo-200/80">
                  <Info className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                  <p>
                    <strong>Thử nghiệm:</strong> Tải lên một đoạn âm thanh ngắn (10-30 giây). Gemini sẽ phân tích tông giọng, cao độ và phong cách để tạo giọng tổng hợp phù hợp.
                  </p>
               </div>

              <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Tải lên Giọng tham khảo</label>
              
              <div 
                onClick={() => !audioFile && fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all group
                   ${audioFile 
                      ? 'border-brand-500/50 bg-brand-500/5' 
                      : 'border-slate-600 hover:border-brand-500 hover:bg-slate-900/50 cursor-pointer'
                   }
                `}
              >
                 <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="audio/wav, audio/mp3, audio/mpeg, audio/ogg" 
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!audioFile ? (
                    <>
                      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-500/20 group-hover:text-brand-400 transition-colors">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand-400" />
                      </div>
                      <p className="text-sm text-slate-300 font-medium">Nhấn để tải lên mẫu giọng nói</p>
                      <p className="text-xs text-slate-500 mt-1">WAV hoặc MP3 (Tối đa 5MB)</p>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-4">
                       <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 bg-brand-500/20 rounded-lg flex items-center justify-center shrink-0">
                            <FileAudio className="w-5 h-5 text-brand-400" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-medium text-slate-200 truncate max-w-[180px]">{audioFile.name}</p>
                            <p className="text-xs text-slate-500">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                       </div>
                       <button 
                        type="button"
                        onClick={clearFile}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Xóa tệp"
                      >
                        <X className="w-5 h-5" />
                       </button>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Tone & Style - Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Tone */}
            <div className="space-y-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Tông giọng</label>
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
              <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Phong cách nói</label>
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
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-bold">
              <MessageSquare className="w-3 h-3" />
              Hướng dẫn bổ sung
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={mode === 'clone' ? "vd: Cố gắng bắt chước giọng điệu chính xác..." : "vd: Ngừng 2 giây sau mỗi câu..."}
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
            placeholder="Nhập văn bản bạn muốn chuyển thành giọng nói..."
            className="w-full flex-1 bg-slate-900 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none font-mono text-sm leading-relaxed custom-scrollbar"
          />
        </div>

        <button
          type="submit"
          disabled={isGenerating || !text.trim() || (mode === 'clone' && !audioBase64)}
          className={`
            w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all
            flex items-center justify-center gap-2 mt-auto
            ${isGenerating || !text.trim() || (mode === 'clone' && !audioBase64)
              ? 'bg-slate-700 cursor-not-allowed opacity-50' 
              : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 hover:shadow-brand-500/25'}
          `}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{mode === 'clone' ? 'Đang phân tích & tổng hợp...' : 'Đang tạo âm thanh...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{mode === 'clone' ? 'Sao chép & Tạo' : 'Tạo âm thanh'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};