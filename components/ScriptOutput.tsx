
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedAudio, AudioSegment } from '../types';
import { VOICES } from '../constants';
import { Download, RefreshCcw, Volume2, Music, Gauge, Maximize2, Minimize2, Play, Pause, FileAudio, CheckCircle2, Loader2, ArrowDownToLine } from 'lucide-react';

interface ScriptOutputProps {
  result: GeneratedAudio;
  onReset: () => void;
  isGenerating?: boolean; // New prop to show active loading state
}

// Sub-component for individual segment item
const SegmentItem = ({ segment, totalSegments }: { segment: AudioSegment, totalSegments: number }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showFullText, setShowFullText] = useState(false);

    const words = segment.text.trim().split(/\s+/);
    const shouldTruncate = words.length > 20;
    const displayText = (!shouldTruncate || showFullText) 
        ? segment.text 
        : `${words.slice(0, 8).join(' ')} ... ${words.slice(-8).join(' ')}`;

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = segment.audioUrl;
        a.download = `part-${segment.id + 1}.wav`;
        a.click();
    };

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:shadow-md hover:border-brand-200">
            <div className="flex items-start gap-4">
                {/* ID Badge */}
                <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
                     <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                        {segment.id + 1}
                     </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-slate-700 text-sm leading-relaxed font-serif mb-3">
                        {displayText}
                        {shouldTruncate && (
                             <button 
                                onClick={() => setShowFullText(!showFullText)}
                                className="inline-flex items-center gap-0.5 ml-2 text-[10px] font-bold text-brand-600 hover:underline uppercase"
                            >
                                {showFullText ? "Thu gọn" : "Xem thêm"}
                            </button>
                        )}
                    </p>

                    {/* Audio Controls */}
                    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                         <button 
                            onClick={togglePlay}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                         >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                         </button>
                         
                         <audio 
                            ref={audioRef}
                            src={segment.audioUrl}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                            className="hidden"
                         />
                         
                         <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            {/* Visual Fake Progress bar - purely visual for this simplified component */}
                            <div className={`h-full bg-brand-400/50 ${isPlaying ? 'animate-pulse w-full' : 'w-0'}`}></div>
                         </div>

                         <button 
                            onClick={handleDownload}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Tải đoạn này"
                         >
                            <ArrowDownToLine className="w-4 h-4" />
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ScriptOutput: React.FC<ScriptOutputProps> = ({ result, onReset, isGenerating }) => {
  const [activeTab, setActiveTab] = useState<'segments' | 'full'>('segments');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const fullAudioRef = useRef<HTMLAudioElement>(null);

  const voiceDetails = VOICES.find(v => v.id === result.voice);

  const handleDownloadFull = () => {
    if (!result.fullAudioUrl) return;
    const now = new Date();
    const fileName = `full-audio-${now.getTime()}.wav`;
    const a = document.createElement('a');
    a.href = result.fullAudioUrl;
    a.download = fileName;
    a.click();
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setPlaybackSpeed(newSpeed);
    if (fullAudioRef.current) {
        fullAudioRef.current.playbackRate = newSpeed;
    }
  };

  useEffect(() => {
    if (result.fullAudioUrl) {
        setActiveTab('full'); // Switch to full player when done
    }
  }, [result.fullAudioUrl]);

  return (
    <div className="animate-fade-in h-full">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden h-full flex flex-col border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white shrink-0">
           <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Volume2 className="w-6 h-6" />
                    </div>
                    <div>
                    <h3 className="font-bold text-lg">Kết quả Âm thanh</h3>
                    <p className="text-brand-100 text-xs uppercase tracking-wider font-medium flex items-center gap-1">
                        {voiceDetails 
                        ? `${voiceDetails.name} • ${voiceDetails.gender}` 
                        : result.voice
                        }
                        {isGenerating && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] animate-pulse">Đang tạo...</span>}
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
        </div>

        {/* Tabs / Controls */}
        <div className="border-b border-slate-100 px-6 py-3 flex items-center gap-4 bg-slate-50/50 shrink-0">
            <button 
                onClick={() => setActiveTab('segments')}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${activeTab === 'segments' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Danh sách đoạn ({result.segments.length})
            </button>
            {result.fullAudioUrl && (
                <button 
                    onClick={() => setActiveTab('full')}
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${activeTab === 'full' ? 'bg-brand-100 text-brand-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <FileAudio className="w-3.5 h-3.5" /> File Gộp
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-white relative">
            
            {activeTab === 'segments' && (
                <div className="p-6 space-y-4">
                    {result.segments.map((seg) => (
                        <div key={seg.id} className="animate-slide-up">
                            <SegmentItem segment={seg} totalSegments={result.segments.length} />
                        </div>
                    ))}
                    
                    {isGenerating && (
                        <div className="flex items-center justify-center py-8 gap-2 text-slate-400 animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Đang tạo đoạn tiếp theo...</span>
                        </div>
                    )}

                    {!isGenerating && result.segments.length > 0 && (
                        <div className="text-center py-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                                <CheckCircle2 className="w-4 h-4" /> Hoàn tất
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'full' && result.fullAudioUrl && (
                <div className="p-8 flex flex-col items-center justify-center h-full space-y-6 animate-fade-in">
                    <div className="w-20 h-20 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-full flex items-center justify-center shadow-xl shadow-brand-500/20 mb-2">
                        <Music className="w-10 h-10 text-white" />
                    </div>
                    
                    <div className="text-center space-y-1">
                        <h4 className="text-lg font-bold text-slate-800">File Âm thanh Hoàn chỉnh</h4>
                        <p className="text-sm text-slate-500">Đã gộp {result.segments.length} đoạn thành công</p>
                    </div>

                    <div className="w-full max-w-md bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-xs font-bold text-slate-400 uppercase">Trình phát</div>
                             <div className="flex items-center gap-2">
                                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                                <select 
                                    value={playbackSpeed}
                                    onChange={handleSpeedChange}
                                    className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                                >
                                    <option value="0.5">0.5x</option>
                                    <option value="1.0">1.0x</option>
                                    <option value="1.5">1.5x</option>
                                    <option value="2.0">2.0x</option>
                                </select>
                            </div>
                        </div>
                        <audio 
                            ref={fullAudioRef}
                            controls 
                            src={result.fullAudioUrl} 
                            className="w-full h-10 rounded-lg"
                        />
                    </div>

                    <button 
                        onClick={handleDownloadFull}
                        className="flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                        <Download className="w-5 h-5" />
                        Tải xuống File Gộp (WAV)
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
