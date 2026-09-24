import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Film, FileText, BookOpen, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, Topic, NoteItem } from '../../types/lms';
import { LMSApiService, getSubjectVisual } from '../../services/api';
import { VideoThumbnail } from '../common/VideoThumbnail';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic: (topic: Topic) => void;
  onSelectNote: (note: NoteItem) => void;
  onSelectSubject: (subject: Subject) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTopic,
  onSelectNote,
  onSelectSubject,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    subjects: Subject[];
    topics: Topic[];
    notes: NoteItem[];
  }>({ subjects: [], topics: [], notes: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ subjects: [], topics: [], notes: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ subjects: [], topics: [], notes: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await LMSApiService.searchAll(query);
        setResults(res);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#0a0a0a]/50 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="w-full max-w-2xl bg-[#fffaf0] border border-[#e5e5e5] rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e5e5e5] bg-[#faf5e8]">
          <Search className="w-5 h-5 text-[#0a0a0a] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lectures, topics, faculty, textbooks, clinical pearls..."
            className="w-full bg-transparent text-[#0a0a0a] placeholder-[#6a6a6a] text-sm focus:outline-none font-medium"
          />
          {query ? (
            <button 
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#e5e5e5]/50"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="px-2 py-0.5 rounded-md text-[10px] font-mono border border-[#e5e5e5] bg-[#f5f0e0] text-[#0a0a0a]">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-5 space-y-5 divide-y divide-[#e5e5e5]">
          {isSearching && (
            <div className="py-8 text-center text-sm text-[#6a6a6a] flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-[#0a0a0a] border-t-transparent animate-spin" />
              Searching clinical video library...
            </div>
          )}

          {!isSearching && query && results.subjects.length === 0 && results.topics.length === 0 && results.notes.length === 0 && (
            <div className="py-12 text-center text-[#6a6a6a] space-y-1">
              <p className="text-sm font-semibold text-[#0a0a0a]">No results found for "{query}"</p>
              <p className="text-xs text-[#6a6a6a]">Try searching by subject name (Anatomy, Medicine), faculty, or topic.</p>
            </div>
          )}

          {/* 1. Matched Subjects */}
          {results.subjects.length > 0 && (
            <div className="space-y-2 pt-2 first:pt-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a] flex items-center gap-1.5 font-mono">
                <BookOpen className="w-3.5 h-3.5 text-[#0a0a0a]" />
                Subjects ({results.subjects.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {results.subjects.map((sub) => {
                  const visual = sub.visual || getSubjectVisual(sub.id);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        onSelectSubject(sub);
                        onClose();
                      }}
                      className="flex items-center justify-between p-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] hover:bg-[#f5f0e0] text-left transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#fffaf0] border border-[#e5e5e5] flex items-center justify-center text-lg shrink-0">
                          <span role="img" aria-label={sub.name}>{visual.emoji}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#0a0a0a] font-display">
                            {sub.name}
                          </div>
                          <div className="text-[11px] text-[#6a6a6a]">{sub.prof} • {sub.total_topics} lectures</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#6a6a6a] group-hover:text-[#0a0a0a] transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Matched Lectures */}
          {results.topics.length > 0 && (
            <div className="space-y-2 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a] flex items-center gap-1.5 font-mono">
                <Film className="w-3.5 h-3.5 text-[#0a0a0a]" />
                Video Lectures ({results.topics.length})
              </span>
              <div className="space-y-1.5">
                {results.topics.map((t) => {
                  const visual = getSubjectVisual(t.subject_id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectTopic(t);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] hover:bg-[#f5f0e0] text-left transition group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-14 sm:w-16 rounded-lg overflow-hidden border border-[#e5e5e5] shrink-0">
                          <VideoThumbnail
                            topic={t}
                            size="sm"
                            showDuration={false}
                            showPlayButton={false}
                          />
                        </div>
                        <div className="truncate">
                          <div className="text-sm font-semibold text-[#0a0a0a] truncate group-hover:text-[#ff4d8b] transition-colors">
                            {t.title}
                          </div>
                          <div className="text-[11px] text-[#6a6a6a] flex items-center gap-2">
                            <span className="capitalize font-bold text-[#0a0a0a] flex items-center gap-1">
                              <span>{visual.emoji}</span> {t.subject_id}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {t.duration_formatted}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#6a6a6a] group-hover:text-[#0a0a0a] shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Matched Notes */}
          {results.notes.length > 0 && (
            <div className="space-y-2 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a] flex items-center gap-1.5 font-mono">
                <FileText className="w-3.5 h-3.5 text-[#ff4d8b]" />
                Clinical Notes & Textbooks ({results.notes.length})
              </span>
              <div className="space-y-1.5">
                {results.notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      onSelectNote(n);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] hover:bg-[#f5f0e0] text-left transition group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-lg bg-[#ff4d8b] text-white flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-semibold text-[#0a0a0a] truncate group-hover:text-[#ff4d8b] transition-colors">
                          {n.title}
                        </div>
                        <div className="text-[11px] text-[#6a6a6a]">
                          {n.file_size_mb ? `${n.file_size_mb} MB • PDF` : 'PDF Note'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6a6a6a] group-hover:text-[#0a0a0a] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
    )}
  </AnimatePresence>
  );
};
