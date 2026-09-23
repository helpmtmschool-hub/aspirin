import React, { useState, useRef, useEffect } from 'react';
import { 
  Topic, 
  LMSTheme, 
  UserNote,
  NoteItem
} from '../types/lms';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  CheckCircle2, 
  Bookmark, 
  Sparkles, 
  FileText, 
  ListVideo, 
  Edit3, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  X,
  Radio
} from 'lucide-react';
import { LiquidGlassWrapper } from './LiquidGlassWrapper';

interface VideoPlayerProps {
  topic: Topic;
  moduleTopics: Topic[];
  subjectName: string;
  onBack: () => void;
  onSelectTopic: (topic: Topic) => void;
  onSaveProgress: (topicId: string, watched: number, total: number, completed: boolean) => void;
  onToggleBookmark: (topicId: string, current: boolean) => void;
  onSaveUserNote: (topicId: string, timestamp: number, text: string) => Promise<UserNote>;
  currentTheme: LMSTheme;
  subjectNotes?: NoteItem[];
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  topic,
  moduleTopics,
  subjectName,
  onBack,
  onSelectTopic,
  onSaveProgress,
  onToggleBookmark,
  onSaveUserNote,
  currentTheme,
  subjectNotes = [],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(topic.duration_seconds || 1800);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState<'pearls' | 'playlist' | 'notes' | 'slides'>('pearls');
  const [selectedSlideNote, setSelectedSlideNote] = useState<NoteItem | null>(subjectNotes[0] || null);
  const [newNoteText, setNewNoteText] = useState('');
  const [userNotes, setUserNotes] = useState<UserNote[]>(topic.user_notes || []);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Resume playback from saved position
  useEffect(() => {
    setStreamError(null);
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      if (topic.watched_seconds && topic.watched_seconds > 5) {
        videoRef.current.currentTime = topic.watched_seconds;
      }
    }
  }, [topic.id]);

  // Handle speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Autohide controls logic
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  // Keyboard Shortcuts (J/K/L, Arrows, Space, M, F, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing a note in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          if (video.paused) {
            video.play();
            setIsPlaying(true);
          } else {
            video.pause();
            setIsPlaying(false);
          }
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 1800, video.currentTime + 10);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          video.muted = !video.muted;
          setIsMuted(video.muted);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsModal((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Time update and periodic auto-save
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Save every 10 seconds or when 90% watched (mark completed)
    if (Math.floor(cur) % 10 === 0) {
      const isCompleted = cur / (videoRef.current.duration || 1800) >= 0.9;
      onSaveProgress(topic.id, cur, videoRef.current.duration || 1800, isCompleted);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgress = () => {
    if (!videoRef.current) return;
    const b = videoRef.current.buffered;
    if (b.length > 0) {
      const end = b.end(b.length - 1);
      const dur = videoRef.current.duration || 1800;
      setBufferedPercent(Math.min(100, Math.round((end / dur) * 100)));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Add timestamped note
  const handleAddUserNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const note = await onSaveUserNote(topic.id, currentTime, newNoteText.trim());
    setUserNotes((prev) => [...prev, note]);
    setNewNoteText('');
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const remM = m % 60;
    const remS = s % 60;
    if (h > 0) {
      return `${h}:${String(remM).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
    }
    return `${remM}:${String(remS).padStart(2, '0')}`;
  };

  // Previous and Next topics
  const currentIndex = moduleTopics.findIndex((t) => t.id === topic.id);
  const prevTopic = currentIndex > 0 ? moduleTopics[currentIndex - 1] : null;
  const nextTopic = currentIndex < moduleTopics.length - 1 ? moduleTopics[currentIndex + 1] : null;

  // Stream URL with Telegram MTProto bridge
  const streamUrl = `/api/stream/${topic.telegram_chat_id}/${topic.telegram_message_id}`;

  return (
    <div className="space-y-4">
      {/* Top Header: Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
            title="Back to Lecture List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs text-slate-400 font-medium">
              {subjectName} • Lecture #{currentIndex + 1}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-1">
              {topic.title}
            </h2>
          </div>
        </div>

        {/* Top Controls: Bookmark, Shortcuts Guide & Completed */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition-colors"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => onToggleBookmark(topic.id, Boolean(topic.is_bookmarked))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              topic.is_bookmarked
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${topic.is_bookmarked ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">Bookmark</span>
          </button>

          <button
            onClick={() => onSaveProgress(topic.id, currentTime, duration, !topic.is_completed)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              topic.is_completed
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{topic.is_completed ? 'Completed' : 'Mark Done'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Cinema Viewport + Split-Screen Clinical Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Video Viewport with Floating Clear Liquid Glass Controls */}
        <div className="lg:col-span-8 space-y-3">
          <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group select-none flex items-center justify-center"
          >
            {/* Native Video Element */}
            <video
              ref={videoRef}
              src={streamUrl}
              className="w-full h-full object-contain cursor-pointer"
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onProgress={handleProgress}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => {
                setIsBuffering(false);
                setIsPlaying(true);
              }}
              onPause={() => {
                setIsPlaying(false);
                setShowControls(true);
              }}
              onSeeked={() => setIsBuffering(false)}
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play();
                    setIsPlaying(true);
                  } else {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                }
              }}
              onError={(e) => {
                setStreamError(
                  "Connecting to Telegram MTProto stream... If the video doesn't play immediately, ensure stream bridge is active on port 8787."
                );
              }}
              playsInline
            />

            {/* Buffering Spinner Overlay */}
            {isBuffering && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-10 pointer-events-none">
                <div className={`w-12 h-12 rounded-full border-3 border-t-transparent animate-spin ${
                  currentTheme === 'marrow' ? 'border-teal-500' : 'border-indigo-500'
                }`} />
                <span className="text-xs font-semibold text-slate-200 mt-3 bg-black/75 px-3 py-1 rounded-full border border-white/10">
                  Streaming Telegram MTProto... {bufferedPercent > 0 ? `(${bufferedPercent}%)` : ''}
                </span>
              </div>
            )}

            {/* Error Notification Banner */}
            {streamError && (
              <div className="absolute top-4 left-4 right-4 bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2.5 backdrop-blur-md shadow-xl animate-fade-in z-20">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-white">Stream Status</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {streamError}
                  </p>
                </div>
              </div>
            )}

            {/* Apple HIG 35% Dimming Overlay behind Clear Glass Controls */}
            <div 
              className={`absolute inset-0 bg-black/35 pointer-events-none transition-opacity duration-300 z-10 ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
              }`} 
            />

            {/* Floating Clear Liquid Glass Control Bar Pill */}
            <div 
              className={`absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-20 transition-all duration-300 transform ${
                showControls || !isPlaying 
                  ? 'translate-y-0 opacity-100 pointer-events-auto' 
                  : 'translate-y-4 opacity-0 pointer-events-none'
              }`}
            >
              <LiquidGlassWrapper
                cornerRadius={16}
                variant="clear"
                className="shadow-2xl"
              >
                <div className="p-2 sm:p-3.5 space-y-1.5 sm:space-y-2.5">
                  {/* Scrubber Bar with Buffered Bar underlay */}
                  <div className="relative flex items-center group/scrubber cursor-pointer">
                    {/* Buffered bar */}
                    <div className="absolute left-0 right-0 h-1 sm:h-1.5 bg-white/15 rounded-full overflow-hidden pointer-events-none">
                      <div
                        className="h-full bg-white/30 rounded-full transition-all duration-300"
                        style={{ width: `${bufferedPercent}%` }}
                      />
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const t = parseFloat(e.target.value);
                        setCurrentTime(t);
                        if (videoRef.current) videoRef.current.currentTime = t;
                      }}
                      className="w-full h-1 sm:h-1.5 bg-transparent rounded-full appearance-none cursor-pointer relative z-10 accent-teal-400"
                    />
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center justify-between gap-1.5 sm:gap-3 text-white">
                    {/* Left: Play / Pause & Skips */}
                    <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            if (videoRef.current.paused) {
                              videoRef.current.play();
                              setIsPlaying(true);
                            } else {
                              videoRef.current.pause();
                              setIsPlaying(false);
                            }
                          }
                        }}
                        className="p-1.5 sm:p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
                        title={isPlaying ? "Pause (K / Space)" : "Play (K / Space)"}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />}
                      </button>

                      <button
                        onClick={() => {
                          if (videoRef.current) videoRef.current.currentTime -= 10;
                        }}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors shrink-0"
                        title="Rewind 10s (J / ←)"
                      >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (videoRef.current) videoRef.current.currentTime += 10;
                        }}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors shrink-0"
                        title="Forward 10s (L / →)"
                      >
                        <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>

                      {/* Time display */}
                      <div className="text-[10px] sm:text-xs font-mono text-slate-200 ml-0.5 sm:ml-1 select-none truncate">
                        <span>{formatTime(currentTime)}</span>
                        <span className="text-white/40 mx-0.5 sm:mx-1">/</span>
                        <span className="text-slate-400">{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Right: Apple Speed Segmented Pills, Volume, Fullscreen */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      {/* Apple Speed Segmented Pill */}
                      <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10">
                        {[1.0, 1.25, 1.5, 2.0].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => handleSpeedChange(spd)}
                            className={`px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded transition-colors ${
                              playbackSpeed === spd
                                ? 'bg-teal-500/40 text-teal-300 border border-teal-500/50'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>

                      {/* Volume Toggle */}
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.muted = !isMuted;
                            setIsMuted(!isMuted);
                          }
                        }}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Mute / Unmute (M)"
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>

                      {/* Fullscreen */}
                      <button
                        onClick={toggleFullscreen}
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="Fullscreen (F)"
                      >
                        {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </LiquidGlassWrapper>
            </div>
          </div>


          {/* Previous / Next Lecture Navigator */}
          <div className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-white/10 rounded-2xl">
            {prevTopic ? (
              <button
                onClick={() => onSelectTopic(prevTopic)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-400">Previous Lecture</div>
                  <div className="line-clamp-1 max-w-[200px] text-slate-300">{prevTopic.title}</div>
                </div>
              </button>
            ) : <div />}

            {nextTopic ? (
              <button
                onClick={() => onSelectTopic(nextTopic)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Next Lecture</div>
                  <div className="line-clamp-1 max-w-[200px] text-slate-300">{nextTopic.title}</div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : <div />}
          </div>
        </div>

        {/* Right Column: Tabbed Clinical Drawer (lg: 4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[520px]">
          {/* Drawer Tab Headers */}
          <div className="flex items-center border-b border-white/10 bg-slate-950/70 p-1">
            <button
              onClick={() => setActiveSideTab('pearls')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeSideTab === 'pearls'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pearls</span>
            </button>
            <button
              onClick={() => setActiveSideTab('playlist')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeSideTab === 'playlist'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListVideo className="w-3.5 h-3.5" />
              <span>Playlist</span>
            </button>
            <button
              onClick={() => setActiveSideTab('notes')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeSideTab === 'notes'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>My Notes</span>
            </button>
            {subjectNotes.length > 0 && (
              <button
                onClick={() => setActiveSideTab('slides')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSideTab === 'slides'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>PDF Slides</span>
              </button>
            )}
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Tab 1: High-Yield Clinical Pearls */}
            {activeSideTab === 'pearls' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    High-Yield Exam Pearls
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">NEET-PG / INI-CET</span>
                </div>

                {topic.pearls && topic.pearls.length > 0 ? (
                  topic.pearls.map((pearl, i) => (
                    <div
                      key={i}
                      className="bg-slate-950/70 border border-white/5 rounded-xl p-3 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{pearl}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No pearls generated for this topic yet.
                  </p>
                )}

                <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-white/5 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">💡 Exam Tip:</div>
                  <p>Pay special attention to radiological signs and investigation of choice mentioned in this video.</p>
                </div>
              </div>
            )}

            {/* Tab 2: Module Playlist */}
            {activeSideTab === 'playlist' && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  In This Module ({moduleTopics.length})
                </div>
                {moduleTopics.map((t, idx) => {
                  const isCurrent = t.id === topic.id;
                  const isDone = Boolean(t.is_completed);

                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTopic(t)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-white/15 border-white/25 text-white shadow-sm'
                          : 'bg-slate-950/40 border-white/5 hover:bg-slate-950/70 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-semibold truncate leading-tight">
                            {t.title}
                          </h5>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {t.file_size_mb ? `${t.file_size_mb} MB` : 'Stream Ready'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isCurrent ? (
                          <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: My Timestamped Notes */}
            {activeSideTab === 'notes' && (
              <div className="space-y-3 flex flex-col h-full">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Timestamped Clinical Notes
                </div>

                {/* Form to add note at current time */}
                <form onSubmit={handleAddUserNote} className="space-y-2">
                  <div className="relative">
                    <textarea
                      placeholder={`Add note at ${formatTime(currentTime)}...`}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-white/20 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>Save Note at {formatTime(currentTime)}</span>
                  </button>
                </form>

                {/* List of notes */}
                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {userNotes.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No timestamped notes yet. Type a clinical observation above to bookmark this moment!
                    </div>
                  ) : (
                    userNotes.map((n, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-slate-950/60 border border-white/5 rounded-xl space-y-1"
                      >
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = n.timestamp_seconds;
                            }
                          }}
                          className="text-[11px] font-mono font-bold text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(n.timestamp_seconds)}</span>
                        </button>
                        <p className="text-xs text-slate-300 leading-snug">
                          {n.note_text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Split-Screen PDF Slides & Notes */}
            {activeSideTab === 'slides' && (
              <div className="space-y-3 flex flex-col h-full">
                {subjectNotes.length > 1 && (
                  <select
                    value={selectedSlideNote?.id || ''}
                    onChange={(e) => {
                      const found = subjectNotes.find((n) => n.id === e.target.value);
                      if (found) setSelectedSlideNote(found);
                    }}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    {subjectNotes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                  </select>
                )}

                {selectedSlideNote ? (
                  <div className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                    <iframe
                      src={`/api/notes/${selectedSlideNote.telegram_chat_id}/${selectedSlideNote.telegram_message_id}#toolbar=0`}
                      className="w-full h-full border-none"
                      title={selectedSlideNote.title}
                    />
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No PDF slides attached to this subject.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-400" />
                <span>Keyboard Shortcuts</span>
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Play / Pause</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-slate-200 border border-white/10">Space or K</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Rewind 10 seconds</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-slate-200 border border-white/10">← or J</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Forward 10 seconds</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-slate-200 border border-white/10">→ or L</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Toggle Mute</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-slate-200 border border-white/10">M</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Toggle Fullscreen</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-slate-200 border border-white/10">F</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Spotlight Search</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-slate-200 border border-white/10">⌘K</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="w-full py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
