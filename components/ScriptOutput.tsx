
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedAudio } from '../types';
import { VOICES } from '../constants';
import { Download, RefreshCcw, Volume2, Music, Gauge, Copy, Check, Image as ImageIcon } from 'lucide-react';

interface ScriptOutputProps {
  result: GeneratedAudio;
  onReset: () => void;
}

export const ScriptOutput: React.FC<ScriptOutputProps> = ({ result, onReset }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    
    const fileName = `${year}-${month}-${day}-${hour}-${min}-${sec}.wav`;

    const a = document.createElement('a');
    a.href = result.audioUrl;
    a.download = fileName;
    a.click();
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(result.imagePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  // Ensure speed persists if audio source changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, result.audioUrl]);

  const voiceDetails = VOICES.find(v => v.id === result.voice);

  return (
    <div className="animate-fade-in h-full">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white flex justify-between items-center">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
               <Volume2 className="w-6 h-6" />
             </div>
             <div>
               <h3 className="font-bold text-lg">Âm thanh đã tạo</h3>
               <p className="text-brand-100 text-xs uppercase tracking-wider font-medium">
                 {voiceDetails 
                   ? `${voiceDetails.name} • ${voiceDetails.gender} • ${voiceDetails.traits}` 
                   : result.voice
                 }
               </p>
             </div>
           </div>
           <button 
            onClick={onReset}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
            title="Tạo mới"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 flex-1 flex flex-col space-y-6 overflow-y-auto">
          
          {/* Text Preview */}
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 shadow-inner">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Văn bản đã nói</h4>
            <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap font-serif">
              {result.text}
            </p>
          </div>

          {/* Audio Player Control Box */}
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg ring-1 ring-black/5">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                       <Music className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-300">Sẵn sàng phát</div>
                      <div className="text-xs text-slate-500">Được tạo qua Gemini 2.5 Flash TTS</div>
                    </div>
                </div>

                {/* Playback Speed Control */}
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700 hover:border-slate-600 transition-colors">
                    <Gauge className="w-4 h-4 text-brand-400" />
                    <select 
                      value={playbackSpeed}
                      onChange={handleSpeedChange}
                      className="bg-transparent text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
                      title="Tốc độ phát"
                    >
                      <option value="0.5">0.5x</option>
                      <option value="0.75">0.75x</option>
                      <option value="1.0">1.0x (Mặc định)</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                      <option value="2.0">2.0x</option>
                    </select>
                </div>
             </div>
             
             <audio 
               ref={audioRef}
               controls 
               autoPlay 
               src={result.audioUrl} 
               className="w-full h-12 rounded-lg" 
             />

             <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-all hover:ring-2 hover:ring-brand-500 hover:ring-offset-2 hover:ring-offset-slate-900"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải xuống WAV</span>
                </button>
             </div>
          </div>

          {/* Image Prompt Box */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 shadow-sm relative group">
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2 text-indigo-800">
                 <ImageIcon className="w-5 h-5" />
                 <h4 className="font-bold uppercase tracking-widest text-xs">Prompt tạo ảnh</h4>
               </div>
               <button
                 onClick={handleCopyPrompt}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
               >
                 {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                 {copied ? "Đã copy" : "Copy prompt"}
               </button>
             </div>
             <p className="text-slate-700 text-sm leading-relaxed font-mono bg-white/50 p-3 rounded-lg border border-indigo-100/50">
               {result.imagePrompt}
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};
