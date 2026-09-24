import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  FastForward, 
  Bookmark, 
  Clock,
  FileText,
  Edit3,
  Trash2,
  SkipForward,
  SkipBack,
  SplitSquareVertical,
  RotateCw,
  Check
} from 'lucide-react';
import { Topic, NoteItem, UserNote } from '../../types/lms';
import { ProgressService } from '../../services/progress';
import { LMSApiService } from '../../services/api';
import { ForensicWatermark } from '../security/ForensicWatermark';
import { motion, AnimatePresence } from 'motion/react';

interface VideoPlayerProps {
  topic: Topic;
  playlist?: Topic[];
  onClose: () => void;
  onSelectTopic?: (topic: Topic) => void;
}

const SPEED_PRESETS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  topic,
  playlist = [],
  onClose,
  onSelectTopic,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(topic.duration_seconds || 1800);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(ProgressService.isBookmarked(topic.id));
  const [lectureUnavailable, setLectureUnavailable] = useState(false);

  // Modern Buffer & Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [clickFeedback, setClickFeedback] = useState<'play' | 'pause' | null>(null);

  // Cross-Device Auto-Resume State
  const [resumePrompt, setResumePrompt] = useState<{
    seconds: number;
    formattedTime: string;
    percent: number;
    countdown: number;
  } | null>(null);
  const [resumedToast, setResumedToast] = useState<string | null>(null);
  const [cloudSavedToast, setCloudSavedToast] = useState(false);
  const pendingSeekRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Companion Notes & Personal Notes State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'pdf' | 'notes'>('pdf');
  const [subjectNotes, setSubjectNotes] = useState<NoteItem[]>([]);
  const [selectedPdfNote, setSelectedPdfNote] = useState<NoteItem | null>(null);
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [isWritingNote, setIsWritingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteTimestamp, setNoteTimestamp] = useState(0);

  // Up-Next Auto-Play State
  const [upNextCountdown, setUpNextCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find index in playlist
  const currentIndex = playlist.findIndex((t) => t.id === topic.id);
  const nextTopic = currentIndex !== -1 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;
  const prevTopic = currentIndex > 0 ? playlist[currentIndex - 1] : null;

  const applyResume = (seconds: number, formatted: string) => {
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    setResumePrompt(null);
    if (videoRef.current && videoRef.current.readyState >= 1) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      const p = videoRef.current.play();
      if (p !== undefined) p.catch(() => {});
      setIsPlaying(true);
    } else {
      pendingSeekRef.current = seconds;
    }
    setResumedToast(`Resumed from ${formatted}`);
    setTimeout(() => setResumedToast(null), 3200);
  };

  const handleStartOver = () => {
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    setResumePrompt(null);
    pendingSeekRef.current = null;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      const p = videoRef.current.play();
      if (p !== undefined) p.catch(() => {});
      setIsPlaying(true);
    }
  };

  const dismissResume = () => {
    if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    setResumePrompt(null);
  };

  useEffect(() => {
    setLectureUnavailable(false);
    setDuration(topic.duration_seconds || 1800);
    setIsLoading(true);
    setIsBuffering(false);
    setBufferedPercent(0);

    // 1. Check intelligent resume position
    const resumeInfo = ProgressService.getResumePosition(topic.id);
    if (resumeInfo.shouldPrompt) {
      setResumePrompt({
        seconds: resumeInfo.resumeSeconds,
        formattedTime: resumeInfo.formattedTime,
        percent: resumeInfo.percent,
        countdown: 6,
      });

      if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
      resumeTimerRef.current = setInterval(() => {
        setResumePrompt((prev) => {
          if (!prev) return null;
          if (prev.countdown <= 1) {
            clearInterval(resumeTimerRef.current!);
            applyResume(prev.seconds, prev.formattedTime);
            return null;
          }
          return { ...prev, countdown: prev.countdown - 1 };
        });
      }, 1000);
    } else {
      setResumePrompt(null);
      pendingSeekRef.current = null;
    }

    // 2. Load User Notes (Local cache + Remote cloud sync)
    setUserNotes(ProgressService.getTopicNotes(topic.id));
    ProgressService.fetchRemoteNotes(topic.id).then((synced) => {
      setUserNotes(synced);
    });

    // 3. Load Companion Subject Notes
    LMSApiService.getSubject(topic.subject_id).then((sub) => {
      if (sub && sub.platform_data) {
        const platformNotes = topic.platform_id ? sub.platform_data[topic.platform_id]?.notes || [] : [];
        const allSubNotes = Object.values(sub.platform_data).flatMap((p) => p.notes);
        const resolved = platformNotes.length > 0 ? platformNotes : allSubNotes;
        setSubjectNotes(resolved);
        if (resolved.length > 0) {
          setSelectedPdfNote(resolved[0]);
        }
      }
    });

    // Reset countdown
    setUpNextCountdown(null);

    return () => {
      if (resumeTimerRef.current) clearInterval(resumeTimerRef.current);
    };
  }, [topic.id, topic.subject_id, topic.platform_id]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'n':
          e.preventDefault();
          openNoteComposer();
          break;
        case 'escape':
          if (upNextCountdown !== null) {
            cancelUpNext();
          } else if (isDrawerOpen) {
            setIsDrawerOpen(false);
          } else if (!document.fullscreenElement) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, isDrawerOpen, upNextCountdown]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      setClickFeedback('play');
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch((err) => {
          console.warn('[VideoPlayer] Play interrupted/prevented:', err);
        });
      }
    } else {
      setClickFeedback('pause');
      videoRef.current.pause();
      setIsPlaying(false);
      ProgressService.flushPendingSync();
      setCloudSavedToast(true);
      setTimeout(() => setCloudSavedToast(false), 2400);
    }
    setTimeout(() => setClickFeedback(null), 450);
  };

  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
    if (videoRef.current.paused) {
      setClickFeedback('play');
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(() => {});
      }
      setTimeout(() => setClickFeedback(null), 450);
    }
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const dur = videoRef.current.duration || duration || 1;
      let maxEnd = 0;
      for (let i = 0; i < videoRef.current.buffered.length; i++) {
        if (videoRef.current.buffered.start(i) <= videoRef.current.currentTime) {
          maxEnd = Math.max(maxEnd, videoRef.current.buffered.end(i));
        }
      }
      setBufferedPercent(Math.min(100, Math.round((maxEnd / dur) * 100)));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
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

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Save progress locally every second & queue for 2-min edge sync
    ProgressService.saveProgress(topic.id, curr, duration, false, {
      subjectId: topic.subject_id,
      platformId: topic.platform_id,
    });
  };

  const handleLoadedMetadata = () => {
    setIsLoading(false);
    setIsBuffering(false);
    if (!videoRef.current) return;
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
    if (pendingSeekRef.current !== null) {
      videoRef.current.currentTime = pendingSeekRef.current;
      setCurrentTime(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
    handleProgress();
  };

  const handleVideoError = () => {
    const err = videoRef.current?.error;
    console.warn('[VideoPlayer] Video element error:', err);
    setIsLoading(false);
    setIsBuffering(false);
    setLectureUnavailable(true);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    ProgressService.saveProgress(topic.id, duration, duration, true, {
      subjectId: topic.subject_id,
      platformId: topic.platform_id,
    });
    ProgressService.flushPendingSync();

    // Trigger Up-Next auto-play countdown if next lecture exists
    if (nextTopic && onSelectTopic) {
      startUpNextCountdown();
    }
  };

  const startUpNextCountdown = () => {
    setUpNextCountdown(5);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setUpNextCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          if (nextTopic && onSelectTopic) {
            onSelectTopic(nextTopic);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelUpNext = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setUpNextCountdown(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isDrawerOpen) {
        setShowControls(false);
      }
    }, 2800);
  };

  // Open personal note composer
  const openNoteComposer = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      setNoteTimestamp(Math.floor(videoRef.current.currentTime));
    }
    setIsDrawerOpen(true);
    setDrawerTab('notes');
    setIsWritingNote(true);
    setTimeout(() => noteInputRef.current?.focus(), 100);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    const added = await ProgressService.addTopicNote(topic.id, noteTimestamp || currentTime, noteText);
    setUserNotes((prev) => [...prev, added].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
    setNoteText('');
    setIsWritingNote(false);
  };

  const handleDeleteNote = async (noteId?: number) => {
    if (!noteId) return;
    await ProgressService.deleteTopicNote(topic.id, noteId);
    setUserNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const chatId = topic.telegram_chat_id || (topic as any).chat_id;
  const messageId = topic.telegram_message_id || (topic as any).message_id;
  const streamSrc = topic.stream_url || (chatId && messageId ? `/api/stream/${chatId}/${messageId}` : '');
  const posterUrl = topic.thumbnail_url || (chatId && messageId ? `/api/thumbnail/${chatId}/${messageId}` : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full h-full max-w-[98vw] max-h-[96vh] flex overflow-hidden rounded-2xl bg-black shadow-2xl select-none"
      >
        {/* Dynamic Forensic Watermark Overlay */}
        <ForensicWatermark />

        {/* LEFT / CENTER: Video Player Pane */}
        <div className={`relative flex-1 flex flex-col justify-between overflow-hidden bg-black transition-all duration-300 ${
          isDrawerOpen ? 'w-full lg:w-3/5' : 'w-full'
        }`}>
          {/* Native HTML5 Video Element */}
          <video
            ref={videoRef}
            src={streamSrc}
            poster={posterUrl}
            autoPlay
            playsInline
            preload="auto"
            onLoadStart={() => setIsLoading(true)}
            onWaiting={() => setIsBuffering(true)}
            onCanPlay={() => {
              setIsLoading(false);
              setIsBuffering(false);
            }}
            onPlaying={() => {
              setIsLoading(false);
              setIsBuffering(false);
              setIsPlaying(true);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onProgress={handleProgress}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Minimalist Apple/Netflix-Style Video Loading & Buffering Indicator */}
          <AnimatePresence>
            {(isLoading || isBuffering) && !lectureUnavailable && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-2xl">
                    <svg className="w-7 h-7 animate-spin text-white" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="opacity-20"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray="55"
                        strokeDashoffset="20"
                        strokeLinecap="round"
                        className="opacity-95"
                      />
                    </svg>
                  </div>
                  <span className="text-[11px] font-medium text-white/90 tracking-wider bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-sm">
                    {isLoading ? 'Loading video...' : 'Buffering...'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Play / Pause Central Ripple Indicator */}
          <AnimatePresence>
            {clickFeedback && (
              <motion.div
                key={clickFeedback}
                initial={{ opacity: 0.9, scale: 0.6 }}
                animate={{ opacity: 0, scale: 1.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
                  {clickFeedback === 'play' ? (
                    <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-white ml-1" />
                  ) : (
                    <Pause className="w-7 h-7 sm:w-9 sm:h-9 fill-white" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lecture Unavailable State */}
          {lectureUnavailable && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-[#0a0a0a]/80 backdrop-blur-md text-center">
              <div className="max-w-md w-full bg-[#fffaf0] border border-[#e5e5e5] rounded-[24px] p-6 sm:p-8 text-[#0a0a0a] shadow-2xl flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-[18px] bg-[#f5f0e0] border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a] mb-4">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#f5f0e0] text-[#0a0a0a] text-[10px] font-mono uppercase font-bold tracking-wider mb-2 border border-[#e5e5e5]">
                  Coming Soon
                </span>
                <h3 className="font-display font-medium text-lg sm:text-xl text-[#0a0a0a] tracking-tight mb-2">
                  {topic.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#3a3a3a] leading-relaxed mb-6">
                  This lecture is currently being prepared and will be available in the library soon. You can explore available lectures in the curriculum.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setLectureUnavailable(false);
                      setIsLoading(true);
                      if (videoRef.current) {
                        videoRef.current.load();
                        const p = videoRef.current.play();
                        if (p !== undefined) p.catch(() => {});
                      }
                    }}
                    className="clay-btn-primary px-5 py-2.5 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Retry Playback
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#f5f0e0] text-[#0a0a0a] text-xs font-medium transition"
                  >
                    Return to Curriculum
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transient Resumed Notification Badge */}
          <AnimatePresence>
            {resumedToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/85 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-xs font-mono font-medium shadow-xl">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{resumedToast}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transient Saved Toast */}
          <AnimatePresence>
            {cloudSavedToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="absolute top-20 right-6 z-50 pointer-events-none"
              >
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white/90 text-xs font-medium shadow-xl">
                  <Check className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Progress Saved</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Auto-Resume Card */}
          <AnimatePresence>
            {resumePrompt && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-auto sm:min-w-[420px] max-w-lg p-4 sm:p-5 rounded-[22px] bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl text-white space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Resume Playback
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-white/60">
                      Auto-resumes in {resumePrompt.countdown}s
                    </span>
                    <button
                      onClick={dismissResume}
                      className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition"
                      aria-label="Dismiss resume prompt"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs sm:text-sm text-white/90 font-medium">
                    You were watching at <span className="font-mono text-white font-bold">{resumePrompt.formattedTime}</span> ({resumePrompt.percent}% completed)
                  </p>
                  <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#ff4d8b] rounded-full transition-all duration-300" 
                      style={{ width: `${resumePrompt.percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    onClick={() => applyResume(resumePrompt.seconds, resumePrompt.formattedTime)}
                    className="flex-1 py-2 px-4 rounded-[12px] bg-[#ff4d8b] hover:bg-[#ff3377] text-white text-xs font-semibold shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Resume at {resumePrompt.formattedTime}
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="py-2 px-3.5 rounded-[12px] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Start at 0:00
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Controls Bar */}
          <div 
            className={`absolute top-0 left-0 right-0 z-40 p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 ${
              showControls || isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-3 truncate max-w-xl">
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition shrink-0"
                aria-label="Close player"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="truncate">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#b8a4ed]">
                  {topic.subject_id} • {topic.module}
                </span>
                <h3 className="text-sm sm:text-base font-medium text-white truncate">
                  {topic.title}
                </h3>
              </div>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2">
              {/* Companion Notes Drawer Toggle */}
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                  isDrawerOpen
                    ? 'bg-[#fffaf0] text-[#0a0a0a] shadow-md'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="Toggle Side-by-Side Notes Drawer"
              >
                <SplitSquareVertical className="w-4 h-4" />
                <span className="hidden sm:inline">Companion Notes</span>
                {userNotes.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isDrawerOpen ? 'bg-[#0a0a0a] text-white' : 'bg-white/20 text-white'
                  }`}>
                    {userNotes.length}
                  </span>
                )}
              </button>

              {/* Bookmark Toggle */}
              <button
                onClick={() => {
                  const nowBookmarked = ProgressService.toggleBookmark(topic);
                  setIsBookmarked(nowBookmarked);
                }}
                className={`p-2 rounded-full transition ${
                  isBookmarked ? 'bg-[#e8b94a] text-[#0a0a0a]' : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="Bookmark lecture"
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>

          {/* Up-Next Countdown Notification Card */}
          {upNextCountdown !== null && nextTopic && (
            <div className="absolute bottom-24 right-6 z-50 p-5 rounded-[20px] bg-[#fffaf0] border border-[#e5e5e5] shadow-2xl max-w-sm text-[#0a0a0a] animate-in slide-in-from-bottom-5 duration-200">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#a4d4c5]/30 text-[#1a3a3a] text-[10px] uppercase font-bold tracking-wider font-mono">
                  <Play className="w-2.5 h-2.5 fill-current text-[#1a3a3a]" /> Up Next in {upNextCountdown}s
                </span>
                <button
                  onClick={cancelUpNext}
                  className="text-[#6a6a6a] hover:text-[#0a0a0a] text-xs font-medium"
                >
                  Cancel
                </button>
              </div>

              <h4 className="text-xs sm:text-sm font-medium text-[#0a0a0a] line-clamp-2 mb-3">
                {nextTopic.title}
              </h4>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    cancelUpNext();
                    if (onSelectTopic) onSelectTopic(nextTopic);
                  }}
                  className="w-full py-2 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] text-xs font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-[#fffaf0]" />
                  Play Now
                </button>
              </div>
            </div>
          )}

          {/* Bottom Controls Bar */}
          <div 
            className={`absolute bottom-0 left-0 right-0 z-40 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/50 to-transparent space-y-3 transition-opacity duration-300 ${
              showControls || isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Timeline Seek Bar with Dynamic Buffer & Played Tracks */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-white/80 shrink-0 select-none">
                {formatTime(currentTime)}
              </span>

              <div className="relative flex-1 h-2 hover:h-3 rounded-full cursor-pointer transition-all flex items-center group/timeline">
                {/* Background Unbuffered Track */}
                <div className="absolute inset-0 rounded-full bg-white/20" />

                {/* Modern Dynamic Buffered Progress Track */}
                <div 
                  className="absolute left-0 top-0 bottom-0 rounded-full bg-white/45 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, bufferedPercent))}%` }}
                />

                {/* Played Progress Track */}
                <div 
                  className="absolute left-0 top-0 bottom-0 rounded-full bg-[#ff4d8b] shadow-sm transition-all duration-75"
                  style={{ width: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
                />

                {/* Scrubber Glow Thumb */}
                <div 
                  className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg border border-black/20 opacity-0 group-hover/timeline:opacity-100 transition-opacity pointer-events-none"
                  style={{ 
                    left: `calc(${Math.min(100, (currentTime / (duration || 1)) * 100)}% - 7px)` 
                  }}
                />

                {/* Interactive Native Range Input overlay */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const newTime = Number(e.target.value);
                    if (videoRef.current) videoRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
              </div>

              <span className="text-xs font-mono text-white/60 shrink-0 select-none">
                {formatTime(duration)}
              </span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Left Controls: Playlist Skip, Play, Rewind, Mute */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Prev Lecture */}
                {prevTopic && onSelectTopic && (
                  <button
                    onClick={() => onSelectTopic(prevTopic)}
                    className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                    title={`Previous: ${prevTopic.title}`}
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                )}

                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-[#fffaf0] text-[#0a0a0a] flex items-center justify-center hover:scale-105 transition shrink-0 shadow-md"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                {/* Next Lecture */}
                {nextTopic && onSelectTopic && (
                  <button
                    onClick={() => onSelectTopic(nextTopic)}
                    className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                    title={`Next: ${nextTopic.title}`}
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => seekRelative(-10)}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Rewind 10s (J)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => seekRelative(10)}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Forward 10s (L)"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Mute / Unmute (M)"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-[#ff4d8b]" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Add Timestamp Note Shortcut Button */}
                <button
                  onClick={openNoteComposer}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-medium transition"
                  title="Add Note at current time (N)"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#ffb084]" />
                  Note at {formatTime(currentTime)}
                </button>
              </div>

              {/* Right Controls: Speed Presets & Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center p-0.5 rounded-full bg-white/10 border border-white/15 text-xs font-mono">
                  {SPEED_PRESETS.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => changeSpeed(spd)}
                      className={`px-2.5 py-1 rounded-full transition ${
                        playbackSpeed === spd
                          ? 'bg-[#fffaf0] text-[#0a0a0a] font-bold shadow-sm'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Toggle Fullscreen (F)"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Side-by-Side Companion Notes & Notes Drawer in Warm Clay Palette */}
        <AnimatePresence>
          {isDrawerOpen && (
            <motion.aside
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="w-full lg:w-2/5 h-full bg-[#fffaf0] border-l border-[#e5e5e5] flex flex-col z-40"
            >
              {/* Drawer Tab Header */}
              <div className="p-3 bg-[#faf5e8] border-b border-[#e5e5e5] flex items-center justify-between">
                <div className="flex items-center p-1 rounded-full bg-[#ebe6d6]/60 border border-[#e5e5e5] text-xs relative">
                  <button
                    onClick={() => setDrawerTab('pdf')}
                    className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-colors duration-150 ${
                      drawerTab === 'pdf' ? 'text-[#fffaf0]' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
                    }`}
                  >
                    {drawerTab === 'pdf' && (
                      <motion.div
                        layoutId="drawer-tab-pill"
                        className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-xs"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <FileText className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">Subject PDF Notes</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('notes')}
                    className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-colors duration-150 ${
                      drawerTab === 'notes' ? 'text-[#fffaf0]' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
                    }`}
                  >
                    {drawerTab === 'notes' && (
                      <motion.div
                        layoutId="drawer-tab-pill"
                        className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-xs"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Edit3 className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">My Notes ({userNotes.length})</span>
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-full text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#ebe6d6]/50 transition"
                  aria-label="Close notes drawer"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {drawerTab === 'pdf' ? (
                /* TAB 1: PDF Viewer */
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  {subjectNotes.length > 1 && (
                    <div className="p-2.5 bg-[#faf5e8] border-b border-[#e5e5e5]">
                      <select
                        value={selectedPdfNote?.id || ''}
                        onChange={(e) => {
                          const n = subjectNotes.find((note) => note.id === e.target.value);
                          if (n) setSelectedPdfNote(n);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-[#e5e5e5] rounded-[10px] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a]"
                      >
                        {subjectNotes.map((note) => (
                          <option key={note.id} value={note.id}>
                            {note.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedPdfNote ? (
                    <iframe
                      src={`/api/stream/${selectedPdfNote.telegram_chat_id}/${selectedPdfNote.telegram_message_id}#toolbar=0&navpanes=0`}
                      title={selectedPdfNote.title}
                      className="w-full flex-1 border-none bg-white"
                    />
                  ) : (
                    <div className="p-8 text-center text-[#6a6a6a] space-y-2 m-auto">
                      <FileText className="w-8 h-8 text-[#9a9a9a] mx-auto" />
                      <p className="text-xs">No PDF textbook indexed for this specific subject yet.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* TAB 2: Personal Timestamped Notes */
                <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
                  {/* Note Creator Form */}
                  <div className="p-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#0a0a0a] font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#ff4d8b]" /> Note at {formatTime(noteTimestamp || currentTime)}
                      </span>
                      <button
                        onClick={() => setNoteTimestamp(Math.floor(currentTime))}
                        className="text-[10px] text-[#6a6a6a] hover:text-[#0a0a0a] underline"
                      >
                        Set to now
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        ref={noteInputRef}
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNote();
                        }}
                        placeholder="Type high-yield clinical takeaway... (Enter to save)"
                        className="flex-1 px-3.5 py-2 bg-white border border-[#e5e5e5] rounded-[12px] text-xs text-[#0a0a0a] placeholder-[#9a9a9a] focus:outline-none focus:border-[#0a0a0a]"
                      />
                      <button
                        onClick={handleSaveNote}
                        disabled={!noteText.trim()}
                        className="clay-btn-primary px-4 py-2 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] disabled:opacity-40 text-[#fffaf0] text-xs font-medium transition shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Saved Notes List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {userNotes.length === 0 ? (
                      <div className="py-12 text-center text-[#6a6a6a] space-y-1">
                        <p className="text-xs font-medium text-[#0a0a0a]">No personal notes taken yet.</p>
                        <p className="text-[11px] text-[#6a6a6a]">Press 'N' while watching to save key clinical points with timestamp links.</p>
                      </div>
                    ) : (
                      userNotes.map((note) => (
                        <div key={note.id} className="p-3 rounded-[14px] bg-white border border-[#e5e5e5] shadow-xs flex items-start justify-between gap-3 group">
                          <div className="space-y-1.5 flex-1">
                            <button
                              onClick={() => seekTo(note.timestamp_seconds)}
                              className="px-2.5 py-0.5 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#fffaf0] text-[10px] font-mono font-medium transition flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              {formatTime(note.timestamp_seconds)}
                            </button>
                            <p className="text-xs text-[#3a3a3a] leading-relaxed">
                              {note.note_text}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 rounded text-[#9a9a9a] hover:text-[#ff4d8b] opacity-0 group-hover:opacity-100 transition"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
};
