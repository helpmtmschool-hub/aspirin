import React, { useState } from 'react';
import { 
  Subject, 
  Topic, 
  NoteItem, 
  LMSTheme 
} from '../types/lms';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Bookmark, 
  FileText, 
  Sparkles, 
  Search, 
  ChevronRight, 
  FolderOpen 
} from 'lucide-react';

interface ModuleViewProps {
  subject: Subject;
  modules: any[];
  notes: NoteItem[];
  onBack: () => void;
  onSelectTopic: (topic: Topic) => void;
  onSelectNote: (note: NoteItem) => void;
  onToggleBookmark: (topicId: string, current: boolean) => void;
  currentTheme: LMSTheme;
}

export const ModuleView: React.FC<ModuleViewProps> = ({
  subject,
  modules,
  notes,
  onBack,
  onSelectTopic,
  onSelectNote,
  onToggleBookmark,
  currentTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'lectures' | 'notes'>('lectures');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unwatched' | 'completed' | 'high_yield'>('all');

  const allTopics: Topic[] = [];
  modules.forEach((mod) => {
    (mod.topics || []).forEach((t: Topic) => {
      allTopics.push(t);
    });
  });

  const filteredTopics = allTopics.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterStatus === 'completed') return t.is_completed;
    if (filterStatus === 'unwatched') return !t.is_completed;
    if (filterStatus === 'high_yield') return t.pearls && t.pearls.length > 0;
    return true;
  });

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors shrink-0"
            title="Back to All Subjects"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span 
                className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border shrink-0"
                style={{ 
                  borderColor: `${subject.color}40`, 
                  backgroundColor: `${subject.color}15`,
                  color: subject.color 
                }}
              >
                {subject.code}
              </span>
              <span className="text-xs text-slate-400 font-medium truncate">
                {subject.prof} • {subject.category}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5 truncate">
              {subject.name}
            </h1>
          </div>
        </div>

        {/* Tab switcher: Lectures vs Practical Notes */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-white/10 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setActiveTab('lectures')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'lectures'
                ? 'bg-white/15 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>Lectures ({allTopics.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'notes'
                ? 'bg-white/15 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Notes ({notes.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Filter ${activeTab === 'lectures' ? 'lectures' : 'notes'} in ${subject.name}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {activeTab === 'lectures' && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {(['all', 'unwatched', 'completed', 'high_yield'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  filterStatus === st
                    ? 'bg-white/15 text-white border border-white/15 font-semibold'
                    : 'bg-slate-900/40 text-slate-400 border border-white/5 hover:text-white'
                }`}
              >
                {st === 'all' && 'All'}
                {st === 'unwatched' && 'Unwatched'}
                {st === 'completed' && 'Completed'}
                {st === 'high_yield' && '⚡ High-Yield'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content: Lectures List (Marrow Schema Style) */}
      {activeTab === 'lectures' && (
        <div className="space-y-2">
          {filteredTopics.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-white/5 rounded-2xl">
              <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-300">No lectures found</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery ? 'Try adjusting your search keywords' : 'No media items indexed in this subject'}
              </p>
            </div>
          ) : (
            filteredTopics.map((topic, index) => {
              const isWatched = Boolean(topic.is_completed);
              const isBookmarked = Boolean(topic.is_bookmarked);

              return (
                <div
                  key={topic.id}
                  onClick={() => onSelectTopic(topic)}
                  className={`group relative bg-slate-900/40 hover:bg-slate-900/80 border rounded-xl p-3 sm:p-3.5 transition-all duration-150 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer ${
                    isWatched
                      ? 'border-white/5 opacity-80'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Index or Status Checkmark */}
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors font-mono text-xs ${
                      isWatched 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                    }`}>
                      {isWatched ? (
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        `#${String(index + 1).padStart(2, '0')}`
                      )}
                    </div>

                    {/* Topic Information */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                          {topic.title}
                        </h4>
                        {topic.pearls && topic.pearls.length > 0 && (
                          <span className="hidden sm:inline text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 shrink-0">
                            High Yield
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                        <span>{topic.duration_formatted || '30 mins'}</span>
                        <span>•</span>
                        <span>{topic.file_size_mb ? `${topic.file_size_mb} MB` : 'Stream Ready'}</span>
                        {topic.pearls && topic.pearls[0] && (
                          <>
                            <span className="hidden md:inline">•</span>
                            <span className="hidden md:inline truncate max-w-md text-slate-400 font-sans">
                              {topic.pearls[0]}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Bookmark & Play */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(topic.id, isBookmarked);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isBookmarked
                          ? 'text-amber-400 bg-amber-500/15'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={isBookmarked ? 'Bookmarked' : 'Bookmark topic'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>

                    <span className="px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold text-white bg-white/10 group-hover:bg-white/20 transition-colors flex items-center gap-1">
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden sm:inline">Play</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Content: Practical Notes List */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredNotes.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-slate-900/40 border border-white/5 rounded-2xl">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-300">No clinical notes available</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Practical guides and OSCE PDFs will appear here once indexed.
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="bg-slate-900/40 hover:bg-slate-900/80 border border-white/10 hover:border-white/20 rounded-xl p-3.5 transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                      {note.title}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">
                      {note.file_size_mb ? `${note.file_size_mb} MB • PDF` : 'Practical Guide'}
                    </p>
                  </div>
                </div>

                <button className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 group-hover:bg-white/20 text-white transition-colors shrink-0">
                  Read
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
