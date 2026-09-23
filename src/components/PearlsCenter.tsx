import React, { useState, useEffect } from 'react';
import { Topic, LMSTheme, Subject } from '../types/lms';
import { LMSApiService } from '../services/api';
import { 
  Sparkles, 
  Search, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  BookOpen, 
  Layers, 
  ListFilter,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface PearlItem {
  topic: Topic;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectColor: string;
  prof: string;
  pearls: string[];
}

interface PearlsCenterProps {
  onSelectTopic: (topic: Topic) => void;
  currentTheme: LMSTheme;
}

export const PearlsCenter: React.FC<PearlsCenterProps> = ({
  onSelectTopic,
  currentTheme,
}) => {
  const [allPearls, setAllPearls] = useState<PearlItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'flashcards' | 'list'>('flashcards');

  // Flashcard deck state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    loadPearls();
  }, []);

  const loadPearls = async () => {
    setIsLoading(true);
    try {
      const data = await LMSApiService.getAllPearls();
      setAllPearls(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Distinct subjects
  const subjectList = Array.from(
    new Map(allPearls.map((p) => [p.subjectId, { id: p.subjectId, name: p.subjectName, code: p.subjectCode }])).values()
  );

  // Filtered pearls
  const filteredPearls = allPearls.filter((item) => {
    const matchesSubject = selectedSubject === 'all' || item.subjectId === selectedSubject;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      item.topic.title.toLowerCase().includes(q) ||
      item.subjectName.toLowerCase().includes(q) ||
      item.pearls.some((p) => p.toLowerCase().includes(q));

    return matchesSubject && matchesSearch;
  });

  // Reset card index if filtered changes
  useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [selectedSubject, searchQuery]);

  // Keyboard navigation for flashcards
  useEffect(() => {
    if (viewMode !== 'flashcards') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentCardIndex, filteredPearls.length]);

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1 < filteredPearls.length ? prev + 1 : 0));
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredPearls.length - 1)));
  };

  const currentItem = filteredPearls[currentCardIndex];

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              NEET-PG & INI-CET Clinical Digest
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            High-Yield Clinical Pearls
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active recall flashcards and key diagnostic facts distilled across 376 lecture topics.
          </p>
        </div>

        {/* Apple Segmented Controller for View Mode */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-white/10 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setViewMode('flashcards')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'flashcards'
                ? 'bg-white/15 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Recall</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-white/15 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>List Digest ({filteredPearls.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search clinical signs, syndromes, investigations, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Subject Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full sm:w-auto bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-white/20 cursor-pointer"
          >
            <option value="all">All Subjects ({allPearls.length} Topics)</option>
            {subjectList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="text-center py-20 text-xs text-slate-400">
          Loading High-Yield Clinical Repository...
        </div>
      ) : filteredPearls.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-white/5 rounded-2xl">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">No pearls matching criteria</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Try resetting your search query or subject filter.
          </p>
        </div>
      ) : viewMode === 'flashcards' && currentItem ? (
        /* View Mode 1: Interactive Active Recall Flashcard */
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Card Counter & Controls */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>
              Card <span className="text-white font-bold">{currentCardIndex + 1}</span> of {filteredPearls.length}
            </span>
            <span className="text-[11px] hidden sm:inline">
              [Space / Click] to flip • [← / →] to navigate
            </span>
          </div>

          {/* Flashcard Box */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative min-h-[320px] sm:min-h-[360px] bg-slate-900/70 border border-white/10 hover:border-white/20 rounded-3xl p-6 sm:p-8 cursor-pointer select-none transition-all duration-300 shadow-2xl flex flex-col justify-between group"
          >
            {/* Top Bar of Flashcard */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border"
                  style={{
                    borderColor: `${currentItem.subjectColor}40`,
                    backgroundColor: `${currentItem.subjectColor}15`,
                    color: currentItem.subjectColor,
                  }}
                >
                  {currentItem.subjectCode}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {currentItem.subjectName}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                <span>{isFlipped ? 'Answer' : 'Prompt'}</span>
              </div>
            </div>

            {/* Middle Content */}
            <div className="my-6 space-y-4">
              {!isFlipped ? (
                /* Card Front: Prompt */
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Clinical Topic & Presentation
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                    {currentItem.topic.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    What are the high-yield diagnostic points and exam takeaways for this topic?
                  </p>
                </div>
              ) : (
                /* Card Back: High-Yield Clinical Pearls */
                <div className="space-y-3 animate-fade-in">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    High-Yield Exam Pearls
                  </div>
                  <div className="space-y-2.5">
                    {currentItem.pearls.map((pearl, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/80 border border-white/5 rounded-xl p-3 text-xs sm:text-sm text-slate-200 leading-relaxed flex items-start gap-2.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                        <span>{pearl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Bar: Action buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <span className="text-[11px] text-slate-400 font-mono text-center sm:text-left">
                {isFlipped ? 'Tap again to flip back' : 'Tap card to reveal answer'}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTopic(currentItem.topic);
                }}
                className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Watch Video Lecture</span>
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              onClick={prevCard}
              className="flex-1 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Pearl</span>
            </button>

            <button
              onClick={nextCard}
              className="flex-1 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <span>Next Pearl</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* View Mode 2: High-Density List Digest */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPearls.map((item) => (
            <div
              key={item.topic.id}
              className="bg-slate-900/50 hover:bg-slate-900/80 border border-white/10 hover:border-white/20 rounded-2xl p-4.5 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border"
                    style={{
                      borderColor: `${item.subjectColor}40`,
                      backgroundColor: `${item.subjectColor}15`,
                      color: item.subjectColor,
                    }}
                  >
                    {item.subjectCode} • {item.subjectName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.topic.duration_formatted || '30m'}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-100 line-clamp-1 mb-2">
                  {item.topic.title}
                </h4>

                <div className="space-y-1.5">
                  {item.pearls.map((p, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-slate-300 bg-slate-950/60 border border-white/5 rounded-lg p-2.5 leading-relaxed flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-end">
                <button
                  onClick={() => onSelectTopic(item.topic)}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Stream Lecture</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
