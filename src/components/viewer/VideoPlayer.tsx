import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1,
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
  Check,
  Tv,
  Moon,
  Subtitles,
  HelpCircle,
  Sparkles,
  ListOrdered
} from 'lucide-react';
import { Topic, NoteItem, UserNote } from '../../types/lms';
import { ProgressService } from '../../services/progress';
import { LMSApiService, extractLectureNumber } from '../../services/api';
import { ForensicWatermark } from '../security/ForensicWatermark';
import { motion, AnimatePresence } from 'motion/react';

interface VideoPlayerProps {
  topic: Topic;
  playlist?: Topic[];
  onClose: () => void;
  onSelectTopic?: (topic: Topic) => void;
}

export interface ChapterItem {
  id: string;
  title: string;
  timeSeconds: number;
  formattedTime: string;
  isPearl?: boolean;
  isUserNote?: boolean;
}

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5];

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
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(ProgressService.isBookmarked(topic.id));
  const [lectureUnavailable, setLectureUnavailable] = useState(false);

  // Modern Buffer & Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [clickFeedback, setClickFeedback] = useState<'play' | 'pause' | null>(null);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [seekRipple, setSeekRipple] = useState<{ direction: 'forward' | 'rewind'; amount: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  // Essential Study Playback Features: Picture-in-Picture & Whiteboard Night Mode
  const [isPiPActive, setIsPiPActive] = useState(false);
  const isPiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && Boolean(document.pictureInPictureEnabled);

  // Whiteboard Night Mode (Inverts bright white slides to dark slate while preserving anatomical diagrams)
  const [isWhiteboardDark, setIsWhiteboardDark] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('aspirin_whiteboard_dark') === 'true';
  });

  // Closed Captions / Subtitles
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('aspirin_captions') === 'true';
  });

  // Shortcuts Modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Seekbar Hover Scrub Tooltip
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekX, setHoverSeekX] = useState<number | null>(null);

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

  // Companion Notes & Chapters Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'pdf' | 'notes' | 'chapters'>('pdf');
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

  // Format time with hours support for comprehensive medical lectures
  const formatTime = (secs: number) => {
    const totalSecs = Math.max(0, Math.floor(secs || 0));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Generate intelligent chapters & key moments from topic pearls and notes
  const chapters: ChapterItem[] = useMemo(() => {
    const list: ChapterItem[] = [
      {
        id: 'intro',
        title: 'Introduction & Core Principles',
        timeSeconds: 0,
        formattedTime: '00:00',
        isPearl: false,
      }
    ];

    const dur = duration || topic.duration_seconds || 1800;

    if (topic.pearls && topic.pearls.length > 0) {
      const step = dur / (topic.pearls.length + 1);
      topic.pearls.forEach((pearl, idx) => {
        const timeMatch = pearl.match(/^(\d{1,2}):(\d{2})\s*[-–—:]\s*(.+)$/);
        let secs: number;
        let cleanTitle: string;
        if (timeMatch) {
          secs = parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
          cleanTitle = timeMatch[3];
        } else {
          secs = Math.round(step * (idx + 1));
          cleanTitle = pearl;
        }
        list.push({
          id: `pearl-${idx}`,
          title: cleanTitle,
          timeSeconds: secs,
          formattedTime: formatTime(secs),
          isPearl: true,
        });
      });
    } else {
      const step = Math.round(dur / 4);
      list.push(
        {
          id: 'pathophys',
          title: 'Pathophysiology & Presentation',
          timeSeconds: step,
          formattedTime: formatTime(step),
          isPearl: false,
        },
        {
          id: 'diagnostics',
          title: 'Clinical Diagnostics & Criteria',
          timeSeconds: step * 2,
          formattedTime: formatTime(step * 2),
          isPearl: false,
        },
        {
          id: 'management',
          title: 'High-Yield Management & Guidelines',
          timeSeconds: step * 3,
          formattedTime: formatTime(step * 3),
          isPearl: true,
        }
      );
    }

    userNotes.forEach((un) => {
      list.push({
        id: `note-${un.id || un.timestamp_seconds}`,
        title: `Note: ${un.note_text}`,
        timeSeconds: un.timestamp_seconds,
        formattedTime: formatTime(un.timestamp_seconds),
        isUserNote: true,
      });
    });

    return list.sort((a, b) => a.timeSeconds - b.timeSeconds);
  }, [topic, userNotes, duration]);

  // Whiteboard Night Mode (Inverts bright white slides while keeping histology & anatomy colors intact)
  const toggleWhiteboardDark = () => {
    const next = !isWhiteboardDark;
    setIsWhiteboardDark(next);
    localStorage.setItem('aspirin_whiteboard_dark', String(next));
    setResumedToast(next ? 'Whiteboard Dark Mode: ON' : 'Whiteboard Dark Mode: OFF');
    setTimeout(() => setResumedToast(null), 2000);
  };

  // Closed Captions / Subtitles Toggle (Minimal & Direct)
  const toggleCaptions = () => {
    const next = !isCaptionsEnabled;
    setIsCaptionsEnabled(next);
    localStorage.setItem('aspirin_captions', String(next));
    if (videoRef.current && videoRef.current.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        const track = videoRef.current.textTracks[i];
        if (track.kind === 'subtitles' || track.kind === 'captions') {
          track.mode = next ? 'showing' : 'hidden';
        }
      }
    }
  };

  // Synchronize HTML5 video text tracks mode whenever captions state or video changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncTracks = () => {
      if (!video.textTracks || video.textTracks.length === 0) return;
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (track.kind === 'subtitles' || track.kind === 'captions') {
          track.mode = isCaptionsEnabled ? 'showing' : 'hidden';
        }
      }
    };

    syncTracks();
    if (video.textTracks) {
      video.textTracks.addEventListener('change', syncTracks);
      video.textTracks.addEventListener('addtrack', syncTracks);
    }
    return () => {
      if (video.textTracks) {
        video.textTracks.removeEventListener('change', syncTracks);
        video.textTracks.removeEventListener('addtrack', syncTracks);
      }
    };
  }, [isCaptionsEnabled]);

  // Picture-in-Picture Mode
  const togglePiP = async () => {
    if (!videoRef.current || !isPiPSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.warn('PiP request failed:', err);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  // Volume Controls
  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
    setIsMuted(clamped === 0);
  };

  const adjustVolume = (delta: number) => {
    const newVol = Math.max(0, Math.min(1, (isMuted ? 0 : volume) + delta));
    handleVolumeChange(newVol);
    setResumedToast(`Volume: ${Math.round(newVol * 100)}%`);
    setTimeout(() => setResumedToast(null), 1500);
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'l':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'arrowleft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'arrowup':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
        case 'd':
          e.preventDefault();
          toggleWhiteboardDark();
          break;
        case 'n':
          e.preventDefault();
          openNoteComposer();
          break;
        case 'c':
          e.preventDefault();
          toggleCaptions();
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsModal((prev) => !prev);
          break;
        case 'escape':
          if (showShortcutsModal) {
            setShowShortcutsModal(false);
          } else if (upNextCountdown !== null) {
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
  }, [isPlaying, isMuted, volume, isWhiteboardDark, isCaptionsEnabled, isDrawerOpen, showShortcutsModal, upNextCountdown, duration]);

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

  const handleVideoTouchOrClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width * 0.38;
    const isRightHalf = clickX > rect.width * 0.62;

    if (lastTapRef.current && (now - lastTapRef.current.time) < 320) {
      if (isLeftHalf) {
        seekRelative(-10);
        setSeekRipple({ direction: 'rewind', amount: 10 });
        setTimeout(() => setSeekRipple(null), 650);
        lastTapRef.current = null;
        return;
      } else if (isRightHalf) {
        seekRelative(10);
        setSeekRipple({ direction: 'forward', amount: 10 });
        setTimeout(() => setSeekRipple(null), 650);
        lastTapRef.current = null;
        return;
      }
    }

    lastTapRef.current = { time: now, x: clickX };

    if (window.innerWidth < 768) {
      setShowControls((prev) => !prev);
    } else {
      togglePlay();
    }
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

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = x / (rect.width || 1);
    const hoverTime = pct * (duration || topic.duration_seconds || 1);
    setHoverSeekTime(hoverTime);
    setHoverSeekX(x);
  };

  const handleSeekMouseLeave = () => {
    setHoverSeekTime(null);
    setHoverSeekX(null);
  };

  const activeChapter = useMemo(() => {
    if (!chapters.length) return null;
    let found = chapters[0];
    for (const chap of chapters) {
      if (chap.timeSeconds <= currentTime) {
        found = chap;
      } else {
        break;
      }
    }
    return found;
  }, [currentTime, chapters]);

  const hoveredChapter = useMemo(() => {
    if (hoverSeekTime === null || !chapters.length) return null;
    let found = chapters[0];
    for (const chap of chapters) {
      if (chap.timeSeconds <= hoverSeekTime) {
        found = chap;
      } else {
        break;
      }
    }
    return found;
  }, [hoverSeekTime, chapters]);

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
  const subtitlesUrl = (topic as any).subtitles_url || (topic as any).transcript_url || (chatId && messageId ? `/api/subtitles/${chatId}/${messageId}` : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onContextMenu={(e) => e.preventDefault()}
        className="relative w-full h-[100dvh] sm:h-full sm:max-w-[98vw] sm:max-h-[96vh] flex flex-col lg:flex-row overflow-hidden rounded-none sm:rounded-2xl bg-black shadow-2xl select-none"
      >
        {/* Dynamic Forensic Watermark Overlay */}
        <ForensicWatermark />

        {/* LEFT / TOP: Video Player Pane (16:9 pinned on mobile when drawer open, 60% on desktop) */}
        <div className={`relative flex flex-col justify-between overflow-hidden bg-black transition-all duration-300 ${
          isDrawerOpen ? 'w-full aspect-video lg:aspect-auto lg:h-full lg:flex-1 shrink-0 lg:shrink' : 'w-full h-full flex-1'
        }`}>
          {/* Native HTML5 Video Element */}
          <video
            ref={videoRef}
            src={streamSrc}
            poster={posterUrl}
            autoPlay
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            style={isWhiteboardDark ? { filter: 'invert(0.92) hue-rotate(180deg) contrast(1.08)' } : undefined}
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
            onClick={handleVideoTouchOrClick}
            className="w-full h-full object-contain cursor-pointer transition-[filter] duration-300"
          >
            {subtitlesUrl && (
              <track
                key={subtitlesUrl}
                kind="subtitles"
                src={subtitlesUrl}
                srcLang="en"
                label="English"
                default={isCaptionsEnabled}
              />
            )}
          </video>

          {/* Quick Double-Tap Seek Ripple Indicator */}
          <AnimatePresence>
            {seekRipple && (
              <div className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none ${
                seekRipple.direction === 'rewind' ? 'left-8 sm:left-20' : 'right-8 sm:right-20'
              }`}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1.15 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center w-20 h-20 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-2xl"
                >
                  {seekRipple.direction === 'rewind' ? (
                    <RotateCcw className="w-8 h-8 text-[#ffb084]" />
                  ) : (
                    <FastForward className="w-8 h-8 text-[#ff4d8b]" />
                  )}
                  <span className="text-[10px] font-mono font-bold mt-1 tracking-wider">
                    {seekRipple.direction === 'rewind' ? '-10s' : '+10s'}
                  </span>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

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
              <div className="absolute top-20 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/85 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-xs font-mono font-medium shadow-xl pointer-events-auto"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{resumedToast}</span>
                </motion.div>
              </div>
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
              <div className="absolute inset-x-0 bottom-24 sm:bottom-28 z-50 flex justify-center px-3 sm:px-4 pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  className="pointer-events-auto w-full max-w-md p-3.5 sm:p-5 rounded-[20px] sm:rounded-[22px] bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl text-white space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider shrink-0">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-ping" />
                      Resume Playback
                    </span>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-[10px] sm:text-[11px] font-mono text-white/60">
                        <span className="hidden sm:inline">Auto-resumes in </span>
                        <span className="sm:hidden">Auto in </span>
                        {resumePrompt.countdown}s
                      </span>
                      <button
                        onClick={dismissResume}
                        className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition shrink-0"
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

                  <div className="flex items-center gap-2 sm:gap-2.5 pt-1">
                    <button
                      onClick={() => applyResume(resumePrompt.seconds, resumePrompt.formattedTime)}
                      className="flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-[12px] bg-[#ff4d8b] hover:bg-[#ff3377] text-white text-xs font-semibold shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                      <span className="truncate">Resume at {resumePrompt.formattedTime}</span>
                    </button>
                    <button
                      onClick={handleStartOver}
                      className="py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-[12px] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 shrink-0" />
                      <span>Start at 0:00</span>
                    </button>
                  </div>
                </motion.div>
              </div>
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#b8a4ed]">
                    {topic.subject_id} • {topic.module}
                  </span>
                  {extractLectureNumber(topic.title) < 99999 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-mono text-white font-semibold">
                      Lecture #{extractLectureNumber(topic.title)}
                    </span>
                  )}
                </div>
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
            <div className="absolute bottom-20 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-6 z-50 p-4 sm:p-5 rounded-[20px] bg-[#fffaf0] border border-[#e5e5e5] shadow-2xl max-w-sm text-[#0a0a0a] animate-in slide-in-from-bottom-5 duration-200">
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
                {extractLectureNumber(nextTopic.title) < 99999 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[#0a0a0a] text-white text-[10px] font-mono font-bold mr-2">
                    #{extractLectureNumber(nextTopic.title)}
                  </span>
                )}
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
            className={`absolute bottom-0 left-0 right-0 z-40 p-3 sm:p-6 bg-gradient-to-t from-black/95 via-black/50 to-transparent space-y-2 sm:space-y-3 transition-opacity duration-300 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] ${
              showControls || isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Timeline Seek Bar with Dynamic Buffer, Chapters & Hover Scrub Tooltip */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[11px] sm:text-xs font-mono text-white/80 shrink-0 select-none">
                {formatTime(currentTime)}
              </span>

              {/* Generous touch target wrapper with hover scrub detection */}
              <div 
                onMouseMove={handleSeekMouseMove}
                onMouseLeave={handleSeekMouseLeave}
                className="relative flex-1 h-8 flex items-center cursor-pointer group/timeline"
              >
                {/* Background Unbuffered Track */}
                <div className="w-full h-1.5 sm:h-2 group-hover/timeline:h-2.5 rounded-full bg-white/20 relative overflow-hidden transition-all">
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

                  {/* Chapter & Pearl Milestone Markers */}
                  {chapters.map((chap) => {
                    const dur = duration || topic.duration_seconds || 1;
                    const pct = (chap.timeSeconds / dur) * 100;
                    if (pct <= 0.5 || pct >= 99.5) return null;
                    return (
                      <div
                        key={chap.id}
                        style={{ left: `${pct}%` }}
                        className={`absolute top-0 bottom-0 w-[2px] z-10 pointer-events-none transition-colors ${
                          chap.isPearl
                            ? 'bg-[#ffb084]'
                            : chap.isUserNote
                            ? 'bg-[#a4d4c5]'
                            : 'bg-white/40'
                        }`}
                        title={`${chap.title} (${chap.formattedTime})`}
                      />
                    );
                  })}
                </div>

                {/* Floating Scrub Hover Tooltip */}
                {hoverSeekTime !== null && hoverSeekX !== null && (
                  <div
                    style={{
                      left: `${hoverSeekX}px`,
                      transform: 'translateX(-50%)',
                    }}
                    className="absolute bottom-full mb-3 pointer-events-none z-50 flex flex-col items-center animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-2.5 py-1.5 rounded-xl bg-black/90 backdrop-blur-md border border-white/20 shadow-xl text-center whitespace-nowrap space-y-0.5">
                      <div className="text-[11px] font-mono font-bold text-white">
                        {formatTime(hoverSeekTime)}
                      </div>
                      {hoveredChapter && (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-white/80 max-w-[200px] truncate">
                          {hoveredChapter.isPearl ? (
                            <Sparkles className="w-2.5 h-2.5 text-[#ffb084] shrink-0" />
                          ) : hoveredChapter.isUserNote ? (
                            <Edit3 className="w-2.5 h-2.5 text-[#a4d4c5] shrink-0" />
                          ) : null}
                          <span className="truncate">{hoveredChapter.title}</span>
                        </div>
                      )}
                    </div>
                    {/* Tooltip triangle tail */}
                    <div className="w-2 h-1 bg-black/90 rotate-45 border-r border-b border-white/20 -mt-0.5" />
                  </div>
                )}

                {/* Scrubber Glow Thumb */}
                <div 
                  className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg border border-black/20 opacity-0 group-hover/timeline:opacity-100 transition-opacity pointer-events-none"
                  style={{ 
                    left: `calc(${Math.min(100, (currentTime / (duration || 1)) * 100)}% - 7px)` 
                  }}
                />

                {/* Interactive Native Range Input overlay with generous touch area */}
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

              <span className="text-[11px] sm:text-xs font-mono text-white/60 shrink-0 select-none">
                {formatTime(duration)}
              </span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
              {/* Left Controls: Playlist Skip, Play, Rewind, Forward, Volume with slider, Note shortcut */}
              <div className="flex items-center gap-1 sm:gap-2.5">
                {/* Prev Lecture */}
                {prevTopic && onSelectTopic && (
                  <button
                    onClick={() => onSelectTopic(prevTopic)}
                    className="p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                    title={`Previous: ${prevTopic.title}`}
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                )}

                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#fffaf0] text-[#0a0a0a] flex items-center justify-center hover:scale-105 transition shrink-0 shadow-md"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-current ml-0.5" />}
                </button>

                {/* Next Lecture */}
                {nextTopic && onSelectTopic && (
                  <button
                    onClick={() => onSelectTopic(nextTopic)}
                    className="p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                    title={`Next: ${nextTopic.title}`}
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => seekRelative(-10)}
                  className="p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Rewind 10s (J)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => seekRelative(10)}
                  className="p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Forward 10s (L)"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                {/* Precision Volume Control with Smooth Expanding Track */}
                <div 
                  className="relative flex items-center group/volume py-1"
                  onMouseEnter={() => setIsVolumeHovered(true)}
                  onMouseLeave={() => setIsVolumeHovered(false)}
                >
                  <button
                    onClick={toggleMute}
                    className="p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                    title={isMuted || volume === 0 ? "Unmute (M)" : "Mute (M)"}
                    aria-label="Toggle mute"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-[#ff4d8b]" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  {/* Desktop & Tablet Smooth Expanding Slider */}
                  <div className="hidden sm:flex items-center transition-all duration-200 overflow-hidden w-0 group-hover/volume:w-20 group-focus-within/volume:w-20 ml-0.5">
                    <div className="relative flex items-center h-5 w-16 cursor-pointer select-none">
                      {/* Track background */}
                      <div className="w-full h-1.5 rounded-full bg-white/20 relative overflow-hidden">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-75"
                          style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                        />
                      </div>
                      {/* Thumb */}
                      <div 
                        className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-md border border-black/10 pointer-events-none transition-all duration-75 -translate-x-1.5"
                        style={{ left: `${(isMuted ? 0 : volume) * 100}%` }}
                      />
                      {/* Native range input overlay for seamless drag / scroll / touch */}
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                        aria-label="Volume slider"
                      />
                    </div>
                  </div>
                </div>

                {/* Add Timestamp Note Shortcut Button */}
                <button
                  onClick={openNoteComposer}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-medium transition"
                  title="Add Note at current time (N)"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#ffb084]" />
                  <span>Note</span>
                </button>

                {/* Active Chapter indicator pill */}
                {activeChapter && (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(true);
                      setDrawerTab('chapters');
                    }}
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/90 text-[11px] font-medium transition max-w-[170px] truncate"
                    title="Jump to Chapters & Pearls"
                  >
                    <ListOrdered className="w-3 h-3 text-[#ffb084] shrink-0" />
                    <span className="truncate">{activeChapter.title}</span>
                  </button>
                )}
              </div>

              {/* Right Controls: Whiteboard Night Mode, CC Subtitles, PiP, Minimal Speed Selector, Shortcuts, Fullscreen */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Whiteboard Night Mode Button */}
                <button
                  onClick={toggleWhiteboardDark}
                  className={`p-1.5 sm:p-2 rounded-full transition ${
                    isWhiteboardDark
                      ? 'bg-[#ffb084] text-[#0a0a0a] shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Whiteboard Dark Mode (Invert Slides): ${isWhiteboardDark ? 'ON' : 'OFF'} (D)`}
                  aria-label="Toggle Whiteboard Dark Mode"
                >
                  <Moon className="w-4 h-4" />
                </button>

                {/* Minimal Closed Captions Toggle */}
                <button
                  onClick={toggleCaptions}
                  className={`p-1.5 sm:p-2 rounded-full transition ${
                    isCaptionsEnabled
                      ? 'bg-[#fffaf0] text-[#0a0a0a] shadow-xs font-semibold'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Subtitles / Closed Captions: ${isCaptionsEnabled ? 'ON' : 'OFF'} (C)`}
                  aria-label="Toggle Subtitles"
                >
                  <Subtitles className="w-4 h-4" />
                </button>

                {/* Picture-in-Picture Button */}
                {isPiPSupported && (
                  <button
                    onClick={togglePiP}
                    className={`hidden sm:flex p-2 rounded-full transition ${
                      isPiPActive
                        ? 'bg-[#b8a4ed] text-[#0a0a0a] shadow-sm'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    title="Picture-in-Picture (P)"
                    aria-label="Toggle Picture in Picture"
                  >
                    <Tv className="w-4 h-4" />
                  </button>
                )}

                {/* Minimal Unified Speed Selector (Desktop & Mobile) */}
                <div className="relative">
                  <button
                    onClick={() => setIsSpeedMenuOpen((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium transition flex items-center gap-1 ${
                      playbackSpeed !== 1.0
                        ? 'bg-[#fffaf0] text-[#0a0a0a] font-bold shadow-xs'
                        : 'bg-white/15 hover:bg-white/25 text-white/90'
                    }`}
                    title="Change Playback Speed"
                    aria-label="Change playback speed"
                  >
                    <span>{playbackSpeed}x</span>
                  </button>

                  <AnimatePresence>
                    {isSpeedMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsSpeedMenuOpen(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 p-1.5 rounded-2xl bg-black/92 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col gap-0.5 z-50 min-w-[80px]"
                        >
                          <span className="text-[9px] uppercase tracking-wider text-white/50 px-2 pt-1 font-mono text-center">
                            Speed
                          </span>
                          {SPEED_PRESETS.map((spd) => (
                            <button
                              key={spd}
                              onClick={() => {
                                changeSpeed(spd);
                                setIsSpeedMenuOpen(false);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono text-center transition flex items-center justify-between gap-2 ${
                                playbackSpeed === spd
                                  ? 'bg-[#fffaf0] text-[#0a0a0a] font-bold shadow-xs'
                                  : 'text-white/80 hover:bg-white/10'
                              }`}
                            >
                              <span>{spd}x</span>
                              {playbackSpeed === spd && <Check className="w-3 h-3 text-[#0a0a0a]" />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Keyboard Shortcuts Dialog Trigger */}
                <button
                  onClick={() => setShowShortcutsModal(true)}
                  className="hidden sm:flex p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Keyboard Shortcuts (?)"
                  aria-label="Keyboard Shortcuts"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
                  title="Toggle Fullscreen (F)"
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        <AnimatePresence>
          {showShortcutsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#fffaf0] border border-[#e5e5e5] rounded-[24px] p-6 text-[#0a0a0a] shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-[#0a0a0a]" />
                    </div>
                    <div>
                      <h3 className="font-display font-medium text-base text-[#0a0a0a]">
                        Keyboard Shortcuts
                      </h3>
                      <p className="text-[11px] text-[#6a6a6a]">Quick shortcuts for active medical revision</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowShortcutsModal(false)}
                    className="p-1.5 rounded-full text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#f5f0e0] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Play / Pause</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">Space / K</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Rewind 10s</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">J</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Forward 10s</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">L</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Seek 5s</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">← / →</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Volume ±10%</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">↑ / ↓</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Mute / Unmute</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">M</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Fullscreen</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">F</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Picture-in-Picture</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">P</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Whiteboard Dark Mode</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">D</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Closed Captions (CC)</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">C</kbd>
                  </div>
                  <div className="col-span-2 flex items-center justify-between p-2 rounded-xl bg-[#faf5e8] border border-[#e5e5e5]">
                    <span className="text-[#3a3a3a]">Take Timestamp Note</span>
                    <kbd className="px-2 py-0.5 rounded bg-white border border-[#e5e5e5] font-mono text-[10px] font-semibold">N</kbd>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowShortcutsModal(false)}
                    className="px-4 py-2 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-[#fffaf0] text-xs font-medium transition"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* RIGHT / BOTTOM: Side-by-Side Companion Notes & Notes Drawer in Warm Clay Palette */}
        <AnimatePresence>
          {isDrawerOpen && (
            <motion.aside
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="w-full lg:w-2/5 flex-1 lg:flex-none lg:h-full bg-[#fffaf0] border-t lg:border-t-0 lg:border-l border-[#e5e5e5] flex flex-col z-40 overflow-hidden min-h-0"
            >
              {/* Drawer Tab Header */}
              <div className="p-3 bg-[#faf5e8] border-b border-[#e5e5e5] flex items-center justify-between gap-2">
                <div className="flex items-center p-1 rounded-full bg-[#ebe6d6]/60 border border-[#e5e5e5] text-xs relative overflow-x-auto no-scrollbar max-w-[calc(100%-2.5rem)]">
                  <button
                    onClick={() => setDrawerTab('pdf')}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors duration-150 whitespace-nowrap ${
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
                    <span className="relative z-10">Subject Notes</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('notes')}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors duration-150 whitespace-nowrap ${
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

                  <button
                    onClick={() => setDrawerTab('chapters')}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors duration-150 whitespace-nowrap ${
                      drawerTab === 'chapters' ? 'text-[#fffaf0]' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
                    }`}
                  >
                    {drawerTab === 'chapters' && (
                      <motion.div
                        layoutId="drawer-tab-pill"
                        className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-xs"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <ListOrdered className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">Chapters ({chapters.length})</span>
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-full text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#ebe6d6]/50 transition shrink-0"
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
              ) : drawerTab === 'notes' ? (
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
              ) : (
                /* TAB 3: Chapters & High-Yield Pearls */
                <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6a6a6a] font-medium">
                      {chapters.length} Key Segments Indexed
                    </span>
                    <span className="text-[10px] font-mono text-[#0a0a0a] bg-[#faf5e8] px-2 py-0.5 rounded-full border border-[#e5e5e5] font-semibold">
                      SharePoint Landmarks
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {chapters.map((chap) => {
                      const isCurrent = activeChapter?.id === chap.id;
                      return (
                        <button
                          key={chap.id}
                          onClick={() => seekTo(chap.timeSeconds)}
                          className={`w-full text-left p-3 rounded-[14px] border transition flex items-start gap-3 group ${
                            isCurrent
                              ? 'bg-[#faf5e8] border-[#0a0a0a] shadow-xs'
                              : 'bg-white border-[#e5e5e5] hover:border-[#b0b0b0]'
                          }`}
                        >
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 transition ${
                            isCurrent 
                              ? 'bg-[#0a0a0a] text-white' 
                              : 'bg-[#f5f0e0] text-[#0a0a0a] group-hover:bg-[#0a0a0a] group-hover:text-white'
                          }`}>
                            {chap.formattedTime}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {chap.isPearl && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-[#ffb084]/25 text-[#9e421e] text-[9px] font-bold uppercase font-mono tracking-wider">
                                  <Sparkles className="w-2.5 h-2.5" /> High-Yield Pearl
                                </span>
                              )}
                              {chap.isUserNote && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-[#a4d4c5]/30 text-[#1a3a3a] text-[9px] font-bold uppercase font-mono tracking-wider">
                                  <Edit3 className="w-2.5 h-2.5" /> Note
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 leading-snug line-clamp-2 ${
                              isCurrent ? 'font-medium text-[#0a0a0a]' : 'text-[#3a3a3a]'
                            }`}>
                              {chap.title}
                            </p>
                          </div>

                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-[#ff4d8b] shrink-0 mt-1.5" />
                          )}
                        </button>
                      );
                    })}
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
