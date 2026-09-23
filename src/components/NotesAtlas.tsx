import React, { useState, useEffect } from 'react';
import { NoteItem, LMSTheme, MBBSProf } from '../types/lms';
import { LMSApiService } from '../services/api';
import { 
  FileText, 
  Search, 
  Download, 
  ExternalLink, 
  BookOpen, 
  Filter,
  GraduationCap
} from 'lucide-react';

interface AtlasNoteItem extends NoteItem {
  subjectName: string;
  subjectCode: string;
  subjectColor: string;
  prof: string;
}

interface NotesAtlasProps {
  onSelectNote: (note: NoteItem) => void;
  currentTheme: LMSTheme;
}

export const NotesAtlas: React.FC<NotesAtlasProps> = ({
  onSelectNote,
  currentTheme,
}) => {
  const [notes, setNotes] = useState<AtlasNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProf, setSelectedProf] = useState<string>('all');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await LMSApiService.getAllNotes();
      setNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const profFilters: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Manuals' },
    { id: '1st Prof', label: '1st Prof' },
    { id: '2nd Prof', label: '2nd Prof' },
    { id: '3rd Prof Part 1', label: '3rd Prof Pt 1' },
    { id: 'Final Prof Part 2', label: 'Final Prof Pt 2' },
  ];

  const filteredNotes = notes.filter((item) => {
    const matchesProf = selectedProf === 'all' || item.prof === selectedProf;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      item.title.toLowerCase().includes(q) ||
      item.subjectName.toLowerCase().includes(q) ||
      item.filename.toLowerCase().includes(q);

    return matchesProf && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <FileText className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Clinical Manuals & Practical Guides
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Clinical Practical Atlas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant access to 144 clinical practical PDFs, OSCE manuals, case records, and high-yield radiology collections.
          </p>
        </div>

        {/* Phase Filter Tabs */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-white/10 shrink-0 overflow-x-auto max-w-full">
          {profFilters.map((tab) => {
            const isActive = selectedProf === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedProf(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search practical notes, OSCE cases, X-rays, instrument guides..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Grid of Clinical Manuals */}
      {isLoading ? (
        <div className="text-center py-20 text-xs text-slate-400">
          Loading Practical Manuals Atlas...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-white/5 rounded-2xl">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-300">No clinical notes matching criteria</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Try adjusting your search query or phase filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className="group bg-slate-900/50 hover:bg-slate-900/80 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div>
                {/* Header: Specialty Badge & Prof */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border"
                    style={{
                      borderColor: `${note.subjectColor}40`,
                      backgroundColor: `${note.subjectColor}15`,
                      color: note.subjectColor,
                    }}
                  >
                    {note.subjectCode} • {note.subjectName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {note.prof}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                  {note.title}
                </h4>
              </div>

              {/* Footer: Metadata & Actions */}
              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  {note.file_size_mb ? `${note.file_size_mb} MB` : 'PDF'}
                </span>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`/api/notes/${note.telegram_chat_id}/${note.telegram_message_id}`}
                    download={note.filename}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Direct Download PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 group-hover:bg-white/20 text-white transition-colors">
                    Read In-App
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
