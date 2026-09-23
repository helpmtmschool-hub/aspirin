import React, { useState, useEffect, useRef } from 'react';
import { Topic, NoteItem, LMSTheme } from '../types/lms';
import { LMSApiService } from '../services/api';
import { 
  Search, 
  X, 
  Play, 
  FileText, 
  Sparkles, 
  ChevronRight,
  CornerDownLeft
} from 'lucide-react';
import { LiquidGlassWrapper } from './LiquidGlassWrapper';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic: (topic: Topic) => void;
  onSelectNote: (note: NoteItem) => void;
  currentTheme: LMSTheme;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTopic,
  onSelectNote,
  currentTheme,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ topics: Topic[]; notes: NoteItem[] }>({
    topics: [],
    notes: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ topics: [], notes: [] });
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const res = await LMSApiService.search(query);
      setResults(res);
      setSelectedIndex(0);
      setIsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Combine items for arrow navigation
  const allItems = [
    ...results.topics.map((t) => ({ type: 'topic' as const, data: t })),
    ...results.notes.map((n) => ({ type: 'note' as const, data: n })),
  ];

  // Global key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < allItems.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, allItems.length - 1)));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          const item = allItems[selectedIndex];
          if (item.type === 'topic') {
            onSelectTopic(item.data as Topic);
          } else {
            onSelectNote(item.data as NoteItem);
          }
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allItems, onClose, onSelectTopic, onSelectNote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-20 bg-black/60 backdrop-blur-md animate-fade-in">
      {/* Floating Apple Spotlight Palette */}
      <div className="w-full max-w-2xl">
        <LiquidGlassWrapper
          cornerRadius={20}
          variant="regular"
          className="border border-white/15 shadow-2xl overflow-hidden"
        >
          {/* Spotlight Search Header */}
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 bg-slate-950/60">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Spotlight: search 19 MBBS subjects, lectures, OSCE notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10 shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results Viewport */}
          <div className="max-h-[60vh] overflow-y-auto p-3 sm:p-4 space-y-3">
            {isLoading && (
              <div className="text-center py-10 text-xs text-slate-400 animate-pulse">
                Querying medical catalog & Telegram indices...
              </div>
            )}

            {!isLoading && query && allItems.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <div className="text-sm font-bold text-slate-300">No matching medical records</div>
                <p className="text-xs mt-1">Try keywords like "Septoplasty", "Nephrology", "Bartter", or "PSM".</p>
              </div>
            )}

            {/* Default Quick Launch Topics */}
            {!query && (
              <div className="text-center py-8 space-y-3">
                <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  Instant search across 376 lectures & 144 clinical manuals
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {['Septoplasty', 'Bartter Syndrome', 'Endocrinology', 'INI CET PYQ', 'PSM Practical', 'Micro Laryngeal'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="text-[11px] px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Video Lectures Group */}
            {results.topics.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  Video Lectures ({results.topics.length})
                </div>
                {results.topics.map((t, idx) => {
                  const isSelected = selectedIndex === idx;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        onSelectTopic(t);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`p-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                              {(t as any).subject_name || t.subject_id}
                            </span>
                            {t.pearls && t.pearls.length > 0 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                High-Yield
                              </span>
                            )}
                          </div>
                          <h5 className="text-xs font-bold truncate">
                            {t.title}
                          </h5>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && (
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <span>Open</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Practical Notes Group */}
            {results.notes.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  Clinical Practical Notes & PDFs ({results.notes.length})
                </div>
                {results.notes.map((n, idx) => {
                  const itemIndex = results.topics.length + idx;
                  const isSelected = selectedIndex === itemIndex;

                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        onSelectNote(n);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={`p-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-0.5">
                            {(n as any).subject_name || n.subject_id}
                          </div>
                          <h5 className="text-xs font-bold truncate">
                            {n.title}
                          </h5>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected && (
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <span>Open</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Hints */}
          <div className="px-4 py-2.5 bg-slate-950/90 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </LiquidGlassWrapper>
      </div>
    </div>
  );
};
