import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Film, 
  FileText, 
  Play, 
  CheckCircle2, 
  Bookmark, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  BookOpen,
  Search,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, Topic, NoteItem, PlatformId, UserProgressItem } from '../../types/lms';
import { PLATFORMS, getSubjectVisual } from '../../services/api';
import { ProgressService } from '../../services/progress';
import { VideoThumbnail } from '../common/VideoThumbnail';

interface PlatformClassroomProps {
  subject: Subject;
  initialPlatform: PlatformId;
  onBack: () => void;
  onPlayTopic: (topic: Topic, playlist?: Topic[]) => void;
  onOpenNote: (note: NoteItem) => void;
}

export const PlatformClassroom: React.FC<PlatformClassroomProps> = ({
  subject,
  initialPlatform,
  onBack,
  onPlayTopic,
  onOpenNote,
}) => {
  const [currentPlatform, setCurrentPlatform] = useState<PlatformId>(initialPlatform);
  const [activeTab, setActiveTab] = useState<'lectures' | 'notes'>('lectures');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [lectureFilter, setLectureFilter] = useState('');
  const [localProgress, setLocalProgress] = useState<Record<string, UserProgressItem>>(() => 
    ProgressService.getLocalProgress()
  );
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    const bms = ProgressService.getBookmarks();
    return new Set(bms.map((b) => b.id));
  });

  useEffect(() => {
    setCurrentPlatform(initialPlatform);
  }, [initialPlatform, subject.id]);

  // Sync progress & bookmarks whenever window regains focus or subject changes
  useEffect(() => {
    const syncState = () => {
      setLocalProgress(ProgressService.getLocalProgress());
      const bms = ProgressService.getBookmarks();
      setBookmarkedIds(new Set(bms.map((b) => b.id)));
    };
    syncState();
    window.addEventListener('focus', syncState);
    return () => window.removeEventListener('focus', syncState);
  }, [subject.id]);

  const platformMeta = PLATFORMS[currentPlatform];
  const pData = subject.platform_data?.[currentPlatform] || {
    platform_id: currentPlatform,
    subject_id: subject.id,
    modules: [],
    notes: [],
  };

  const totalLectures = pData.modules.reduce((sum, m) => sum + m.topics.length, 0);
  const totalNotes = pData.notes.length;

  const toggleModule = (modName: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [modName]: !prev[modName],
    }));
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    pData.modules.forEach((m) => {
      next[m.name] = true;
    });
    setCollapsedModules(next);
  };

  const expandAll = () => {
    setCollapsedModules({});
  };

  const handleToggleBookmark = (e: React.MouseEvent, topic: Topic) => {
    e.stopPropagation();
    const isNow = ProgressService.toggleBookmark(topic);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isNow) next.add(topic.id);
      else next.delete(topic.id);
      return next;
    });
  };

  // Filtered modules and topics
  const query = lectureFilter.trim().toLowerCase();
  const filteredModules = pData.modules
    .map((mod) => {
      const matchingTopics = query
        ? mod.topics.filter(
            (t) =>
              t.title.toLowerCase().includes(query) ||
              t.filename.toLowerCase().includes(query) ||
              (t.pearls && t.pearls.some((p) => p.toLowerCase().includes(query)))
          )
        : mod.topics;

      return {
        ...mod,
        topics: matchingTopics,
      };
    })
    .filter((mod) => (query ? mod.topics.length > 0 : true));

  const allTopicsInCurriculum = pData.modules.flatMap((m) => m.topics);
  const visual = subject.visual || getSubjectVisual(subject.id);
  const completedLecturesCount = pData.modules.reduce((sum, m) => {
    return sum + m.topics.filter((t) => localProgress[t.id]?.isCompleted || t.is_completed).length;
  }, 0);
  const progressPct = totalLectures > 0 ? Math.round((completedLecturesCount / totalLectures) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Platform Track Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] text-xs font-semibold transition shadow-xs self-start"
          aria-label="Back to 19 subjects"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to 19 MBBS Subjects</span>
        </motion.button>

        {/* Quick Platform Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] overflow-x-auto max-w-full relative self-start sm:self-auto">
          {(subject.available_platforms && subject.available_platforms.length > 0 
            ? subject.available_platforms 
            : (['prepx_en', 'prepx_hi', 'cerebellum'] as PlatformId[])
          ).map((pid) => {
            const p = PLATFORMS[pid];
            if (!p) return null;
            const isActive = currentPlatform === pid;

            return (
              <button
                key={pid}
                onClick={() => setCurrentPlatform(pid)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${
                  isActive ? 'text-white' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="classroom-platform-pill"
                    className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-xs"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{p.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dedicated Subject Hero Banner */}
      <div className="p-6 sm:p-8 rounded-[24px] bg-[#faf5e8] border border-[#e5e5e5] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#fffaf0] border border-[#e5e5e5] flex items-center justify-center text-4xl sm:text-5xl shadow-xs shrink-0">
              <span role="img" aria-label={subject.name}>{visual.emoji}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0a0a0a] text-white">
                  {subject.prof}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f5f0e0] text-[#0a0a0a] border border-[#e5e5e5]">
                  {subject.category}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6a6a6a]">
                  Track: {platformMeta.name}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-[#0a0a0a] font-display tracking-tight">
                {subject.name}
              </h1>
              <p className="text-xs sm:text-sm text-[#3a3a3a] max-w-2xl leading-relaxed">
                {visual.tagline}
              </p>
              {platformMeta.facultyHighlight && (
                <p className="text-[11px] text-[#6a6a6a] pt-0.5">
                  <span className="font-semibold text-[#0a0a0a]">Faculty:</span> {platformMeta.facultyHighlight}
                </p>
              )}
            </div>
          </div>

          {/* Right Stats & Progress */}
          <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-[#e5e5e5] shrink-0">
            <div className="flex items-center gap-5 text-right">
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#0a0a0a]">
                  {totalLectures}
                </div>
                <div className="text-[11px] text-[#6a6a6a] font-mono">Lectures</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#ff4d8b]">
                  {totalNotes}
                </div>
                <div className="text-[11px] text-[#6a6a6a] font-mono">Notes</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#22c55e]">
                  {progressPct}%
                </div>
                <div className="text-[11px] text-[#6a6a6a] font-mono">Watched</div>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="w-full md:w-36 h-2 rounded-full bg-[#ebe6d6] overflow-hidden">
              <div 
                className="h-full bg-[#0a0a0a] rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Segmented Toggle: [Lectures | Notes] */}
      <div className="flex items-center justify-center">
        <div className="flex items-center p-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] w-full max-w-md shadow-sm relative">
          <button
            onClick={() => setActiveTab('lectures')}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-150 ${
              activeTab === 'lectures' ? 'text-white' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
            }`}
          >
            {activeTab === 'lectures' && (
              <motion.div
                layoutId="classroom-mode-pill"
                className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-xs"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Film className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Video Lectures ({totalLectures})</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-150 ${
              activeTab === 'notes' ? 'text-white' : 'text-[#6a6a6a] hover:text-[#0a0a0a]'
            }`}
          >
            {activeTab === 'notes' && (
              <motion.div
                layoutId="classroom-mode-pill"
                className="absolute inset-0 bg-[#0a0a0a] rounded-full shadow-xs"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <FileText className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Clinical Notes ({totalNotes})</span>
          </button>
        </div>
      </div>

      {/* In-Classroom Filter & Controls Bar */}
      {activeTab === 'lectures' && pData.modules.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-2">
          {/* Search Filter Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6a6a6a]" />
            <input
              type="text"
              value={lectureFilter}
              onChange={(e) => setLectureFilter(e.target.value)}
              placeholder={`Filter lectures in ${subject.name}...`}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#e5e5e5] bg-[#faf5e8] text-xs sm:text-sm text-[#0a0a0a] placeholder-[#6a6a6a] focus:outline-none focus:border-[#0a0a0a] transition"
            />
          </div>

          {/* Expand / Collapse All Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono">
            <button
              onClick={expandAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#6a6a6a] hover:text-[#0a0a0a] transition"
              title="Expand all modules"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand All</span>
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#6a6a6a] hover:text-[#0a0a0a] transition"
              title="Collapse all modules"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Collapse All</span>
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'lectures' ? (
        <div className="space-y-4">
          {pData.modules.length === 0 ? (
            <div className="py-16 text-center text-[#6a6a6a] space-y-3 bg-[#faf5e8] rounded-[24px] border border-[#e5e5e5]">
              <Film className="w-8 h-8 text-[#0a0a0a] mx-auto opacity-40" />
              <p className="text-sm font-medium text-[#0a0a0a]">No video lectures indexed for this platform yet.</p>
              <p className="text-xs text-[#6a6a6a]">Switch to another platform tab above to explore content.</p>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="py-12 text-center text-[#6a6a6a] space-y-2 bg-[#faf5e8] rounded-[24px] border border-[#e5e5e5]">
              <Search className="w-6 h-6 text-[#0a0a0a] mx-auto opacity-30" />
              <p className="text-sm font-medium text-[#0a0a0a]">No lectures matching "{lectureFilter}"</p>
              <button
                onClick={() => setLectureFilter('')}
                className="text-xs font-semibold text-[#0a0a0a] underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            filteredModules.map((mod) => {
              // If there's an active search query, keep module auto-expanded
              const isCollapsed = !query && collapsedModules[mod.name] === true;

              return (
                <div
                  key={mod.id}
                  className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] overflow-hidden shadow-sm"
                >
                  {/* Module Header Bar */}
                  <div
                    onClick={() => toggleModule(mod.name)}
                    className="p-4 sm:p-5 bg-[#f5f0e0]/70 flex items-center justify-between cursor-pointer hover:bg-[#f5f0e0] transition border-b border-[#e5e5e5]/60 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#fffaf0] border border-[#e5e5e5] flex items-center justify-center font-bold text-xs text-[#0a0a0a]">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[#0a0a0a] font-display">
                          {mod.name}
                        </h4>
                        <span className="text-xs text-[#6a6a6a] font-mono">
                          {mod.topics.length} Lectures
                        </span>
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-[#6a6a6a]">
                      {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Topic Items List Accordion */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-[#e5e5e5]/70 bg-[#fffaf0]">
                          {mod.topics.map((topic) => {
                            const prog = localProgress[topic.id];
                            const isWatched = prog?.isCompleted || topic.is_completed;
                            const watchedSecs = prog?.watchedSeconds ?? topic.watched_seconds ?? 0;
                            const dur = prog?.totalSeconds || topic.duration_seconds || 1800;
                            const pct = Math.min(100, Math.round((watchedSecs / dur) * 100));
                            const isBookmarked = bookmarkedIds.has(topic.id);
                            const hasPearls = topic.pearls && topic.pearls.length > 0;

                            return (
                              <motion.div
                                key={topic.id}
                                whileHover={{ backgroundColor: "rgba(250, 245, 232, 0.7)" }}
                                whileTap={{ scale: 0.995 }}
                                onClick={() => onPlayTopic(topic, allTopicsInCurriculum)}
                                className="p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  {/* Video Thumbnail Preview */}
                                  <div className="w-20 sm:w-24 shrink-0 rounded-xl overflow-hidden border border-[#e5e5e5] shadow-xs">
                                    <VideoThumbnail
                                      topic={topic}
                                      size="sm"
                                      showDuration={false}
                                      showPlayButton={true}
                                    />
                                  </div>

                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="text-xs sm:text-sm font-semibold text-[#0a0a0a] truncate group-hover:text-[#ff4d8b] transition-colors">
                                        {topic.title}
                                      </h5>
                                      {hasPearls && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#e8b94a]/20 text-[#855900] border border-[#e8b94a]/30 shrink-0">
                                          <Sparkles className="w-2.5 h-2.5 text-[#e8b94a]" />
                                          High-Yield
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#6a6a6a]">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {topic.duration_formatted}
                                      </span>
                                      {isWatched && (
                                        <span className="flex items-center gap-1 text-[#22c55e] font-semibold">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Watched
                                        </span>
                                      )}
                                      {watchedSecs > 10 && !isWatched && (
                                        <span>{pct}% watched</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right Actions: Bookmark & Play */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Bookmark button */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleBookmark(e, topic)}
                                    className={`p-2 rounded-lg border transition ${
                                      isBookmarked
                                        ? 'bg-[#e8b94a] text-[#0a0a0a] border-[#e8b94a]'
                                        : 'bg-[#fffaf0] border-[#e5e5e5] text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#faf5e8]'
                                    }`}
                                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark lecture'}
                                    aria-label="Bookmark lecture"
                                  >
                                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                                  </button>

                                  <span className="hidden sm:inline-flex text-xs font-bold text-[#0a0a0a] px-3 py-1 rounded-lg border border-[#e5e5e5] bg-[#fffaf0] group-hover:bg-[#0a0a0a] group-hover:text-white transition">
                                    Play
                                  </span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Notes Tab */
        <div className="space-y-4">
          {totalNotes === 0 ? (
            <div className="py-16 text-center text-[#6a6a6a] space-y-3 bg-[#faf5e8] rounded-[24px] border border-[#e5e5e5]">
              <FileText className="w-8 h-8 text-[#0a0a0a] mx-auto opacity-40" />
              <p className="text-sm font-medium text-[#0a0a0a]">No clinical notes uploaded for this track yet.</p>
              <p className="text-xs text-[#6a6a6a]">Switch to another platform tab or check the Master Review Books shelf.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pData.notes.map((note) => (
                <motion.div
                  key={note.id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenNote(note)}
                  className="p-5 rounded-[20px] border border-[#e5e5e5] bg-[#f5f0e0] hover:bg-[#faf5e8] cursor-pointer shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#fffaf0] border border-[#e5e5e5] flex items-center justify-center text-[#0a0a0a]">
                      <FileText className="w-5 h-5 text-[#ff4d8b]" />
                    </div>

                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6a6a6a]">
                        Clinical Notes • {note.subject_id}
                      </span>
                      <h4 className="text-sm font-bold text-[#0a0a0a] font-display line-clamp-2 leading-snug mt-1">
                        {note.title}
                      </h4>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#e5e5e5]/80 mt-4 flex items-center justify-between text-xs text-[#6a6a6a] font-mono">
                    <span>{note.file_size_mb ? `${note.file_size_mb} MB` : 'PDF'}</span>
                    <span className="text-[#0a0a0a] font-sans font-bold group-hover:underline">
                      Open PDF →
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
