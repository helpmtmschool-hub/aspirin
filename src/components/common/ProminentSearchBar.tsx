import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Film, 
  FileText, 
  BookOpen, 
  Clock, 
  ArrowRight,
  Flame,
  Zap,
  TrendingUp,
  Layers,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, Topic, NoteItem } from '../../types/lms';
import { LMSApiService, getSubjectVisual, PLATFORMS } from '../../services/api';

interface ProminentSearchBarProps {
  onSelectTopic: (topic: Topic) => void;
  onSelectNote: (note: NoteItem) => void;
  onSelectSubject: (subject: Subject) => void;
  className?: string;
  placeholder?: string;
}

export const ProminentSearchBar: React.FC<ProminentSearchBarProps> = ({
  onSelectTopic,
  onSelectNote,
  onSelectSubject,
  className = '',
  placeholder = 'Search 2,379+ lectures, 24 textbooks, topics, PYQs...',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{
    subjects: Subject[];
    topics: Topic[];
    notes: NoteItem[];
  }>({ subjects: [], topics: [], notes: [] });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global shortcut: Ctrl+K or Cmd+K focuses this prominent in-page search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (e.key === 'Escape') {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to custom 'focus-prominent-search' event
  useEffect(() => {
    const handleFocusSearch = () => {
      inputRef.current?.focus();
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.addEventListener('focus-prominent-search', handleFocusSearch);
    return () => window.removeEventListener('focus-prominent-search', handleFocusSearch);
  }, []);

  // Click outside to collapse live dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
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
    }, 120);

    return () => clearTimeout(timer);
  }, [query]);

  const quickFilterChips = [
    { label: 'High Yield PYQs', query: 'PYQ', icon: Flame },
    { label: 'General Medicine', query: 'Medicine', icon: BookOpen },
    { label: 'Gross Anatomy', query: 'Anatomy', icon: Layers },
    { label: 'Master Textbooks', query: 'Dr.', icon: FileText },
    { label: 'Surgery', query: 'Surgery', icon: Zap },
    { label: 'Pharmacology', query: 'Pharmacology', icon: TrendingUp },
  ];

  const handleSelectChip = (chipQuery: string) => {
    setQuery(chipQuery);
    setIsFocused(true);
    inputRef.current?.focus();
  };

  const hasResults = results.subjects.length > 0 || results.topics.length > 0 || results.notes.length > 0;
  const isDropdownOpen = isFocused && (query.trim().length >= 2 || hasResults);

  return (
    <div ref={containerRef} className={`relative w-full max-w-3xl lg:max-w-4xl mx-auto px-1 sm:px-0 ${className}`}>
      {/* Central Search Input Container */}
      <div 
        className={`relative z-30 flex items-center w-full h-12 sm:h-16 px-3.5 sm:px-5 rounded-2xl sm:rounded-3xl bg-white border transition-all duration-200 ${
          isFocused
            ? 'border-stone-900 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-4 ring-stone-900/5'
            : 'border-stone-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-stone-400'
        }`}
      >
        {/* Search Icon */}
        <Search className={`w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 transition-colors shrink-0 ${
          isFocused ? 'text-stone-950' : 'text-stone-400'
        }`} />

        {/* Input Element */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent px-2.5 sm:px-4 text-stone-900 placeholder:text-stone-400 text-xs sm:text-base font-medium focus:outline-none"
        />

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition mr-1"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}

        {/* Keyboard Shortcut Tag */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 pl-2 border-l border-stone-200">
          <kbd className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-600 font-mono text-[11px] font-semibold">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* High-Yield Quick Suggestions / Filter Chips (Scrollable row on mobile, single row on desktop) */}
      <div className="mt-2.5 sm:mt-3.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:justify-center px-1 sm:px-2 pb-1 scroll-smooth">
        <span className="text-[11px] font-mono text-stone-500 shrink-0 hidden md:inline">Quick Find:</span>
        {quickFilterChips.map((chip) => {
          const Icon = chip.icon;
          const isSelected = query.toLowerCase() === chip.query.toLowerCase();
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSelectChip(chip.query)}
              className={`inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium transition cursor-pointer border shrink-0 ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                  : 'bg-white/80 hover:bg-white text-stone-600 hover:text-stone-900 border-stone-200/80 shadow-2xs'
              }`}
            >
              <Icon className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-stone-400'}`} />
              <span className="whitespace-nowrap">{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live Search Results Dropdown Flyout */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[3.25rem] sm:top-[4.25rem] inset-x-0 z-40 bg-white border border-stone-200/90 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden max-h-[60vh] sm:max-h-[72vh] flex flex-col"
          >
            {/* Loading Indicator */}
            {isSearching && (
              <div className="p-3.5 bg-stone-50 border-b border-stone-100 flex items-center justify-center gap-2 text-xs text-stone-600 font-mono">
                <div className="w-3.5 h-3.5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                <span>Searching clinical index...</span>
              </div>
            )}

            {/* Results Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 divide-y divide-stone-100">
              {/* Category 1: Matching Subjects */}
              {results.subjects.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                      Matching Subjects ({results.subjects.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.subjects.map((sub) => {
                      const visual = getSubjectVisual(sub.id);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setIsFocused(false);
                            onSelectSubject(sub);
                          }}
                          className="flex items-center gap-3 p-2.5 rounded-xl border border-stone-200/80 bg-stone-50/70 hover:bg-stone-100 hover:border-stone-300 transition cursor-pointer group"
                        >
                          <span className="text-xl shrink-0">{visual.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-stone-900 font-display truncate group-hover:text-emerald-700 transition-colors">
                              {sub.name}
                            </h4>
                            <span className="text-[10px] text-stone-600 font-mono">
                              {sub.prof} • {sub.total_topics || 0} Lectures
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 2: Matching Video Lectures */}
              {results.topics.length > 0 && (
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-emerald-600" />
                      Clinical Lectures ({results.topics.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {results.topics.map((topic) => {
                      const platformMeta = topic.platform_id ? PLATFORMS[topic.platform_id] : null;
                      return (
                        <div
                          key={topic.id}
                          onClick={() => {
                            setIsFocused(false);
                            onSelectTopic(topic);
                          }}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200/80 transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                              <Film className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-stone-900 truncate group-hover:text-emerald-700 transition">
                                {topic.title}
                              </h5>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-600 font-mono">
                                <span>{topic.subject_id.replace(/_/g, ' ')}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-stone-600" />
                                  {topic.duration_formatted || '30 mins'}
                                </span>
                                {platformMeta && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-semibold">{platformMeta.shortName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {topic.is_high_yield && (
                              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                                High Yield
                              </span>
                            )}
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs transition"
                            >
                              <span>Play</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 3: Master Textbooks & Notes */}
              {results.notes.length > 0 && (
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Textbooks & Study Notes ({results.notes.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {results.notes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => {
                          setIsFocused(false);
                          onSelectNote(note);
                        }}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200/80 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-stone-900 truncate group-hover:text-blue-700 transition">
                              {note.title}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-stone-600 font-mono">
                              <span className="uppercase">{note.subject_id.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span>{note.file_size_mb ? `${note.file_size_mb} MB` : 'PDF'}</span>
                              {note.is_master_textbook && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-700 font-semibold">Master Clinical Review</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-[11px] font-semibold flex items-center gap-1 shadow-xs transition shrink-0"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3 text-stone-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results Message */}
              {!isSearching && query.trim().length >= 2 && !hasResults && (
                <div className="py-10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-600">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-stone-800">
                    No lectures or textbooks found matching "{query}"
                  </p>
                  <p className="text-xs text-stone-600 max-w-sm mx-auto">
                    Try searching for subject names like <span className="font-semibold text-stone-800">Medicine</span>, <span className="font-semibold text-stone-800">Anatomy</span>, faculty names like <span className="font-semibold text-stone-800">Marwah</span>, or topic keywords.
                  </p>
                </div>
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600 font-mono">
              <span className="flex items-center gap-1">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-700">ESC</kbd>
                <span>to dismiss</span>
              </span>
              <span>2,379+ indexed clinical files</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
