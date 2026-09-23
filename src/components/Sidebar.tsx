import React, { useState } from 'react';
import { 
  Subject, 
  MBBSProf, 
  LMSTheme 
} from '../types/lms';
import { 
  BookOpen, 
  Sparkles, 
  FileText, 
  Bookmark, 
  ChevronDown, 
  ChevronRight, 
  PanelLeftClose, 
  PanelLeft,
  X
} from 'lucide-react';

interface SidebarProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSelectSubject: (subject: Subject) => void;
  activeView: 'curriculum' | 'pearls' | 'notes_atlas' | 'bookmarks';
  onChangeView: (view: 'curriculum' | 'pearls' | 'notes_atlas' | 'bookmarks') => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  currentTheme: LMSTheme;
}

export const Sidebar: React.FC<SidebarProps> = ({
  subjects,
  selectedSubject,
  onSelectSubject,
  activeView,
  onChangeView,
  isOpen,
  onToggleOpen,
  currentTheme,
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    '1st Prof': true,
    '2nd Prof': true,
    '3rd Prof Part 1': true,
    'Final Prof Part 2': true,
  });

  const toggleSection = (prof: string) => {
    setOpenSections((prev) => ({ ...prev, [prof]: !prev[prof] }));
  };

  const profGroups: Array<{ title: MBBSProf; label: string; subjects: Subject[] }> = [
    { 
      title: '1st Prof', 
      label: '1st Prof • Pre-Clinical', 
      subjects: subjects.filter((s) => s.prof === '1st Prof') 
    },
    { 
      title: '2nd Prof', 
      label: '2nd Prof • Para-Clinical', 
      subjects: subjects.filter((s) => s.prof === '2nd Prof') 
    },
    { 
      title: '3rd Prof Part 1', 
      label: '3rd Prof Part 1', 
      subjects: subjects.filter((s) => s.prof === '3rd Prof Part 1') 
    },
    { 
      title: 'Final Prof Part 2', 
      label: 'Final Prof Part 2 • Clinical', 
      subjects: subjects.filter((s) => s.prof === 'Final Prof Part 2') 
    },
  ];

  const handleNavClick = (view: 'curriculum' | 'pearls' | 'notes_atlas' | 'bookmarks') => {
    onChangeView(view);
    // On mobile / tablet screens, automatically close drawer after clicking
    if (window.innerWidth < 1024) {
      onToggleOpen();
    }
  };

  const handleSubjectClick = (sub: Subject) => {
    onChangeView('curriculum');
    onSelectSubject(sub);
    // On mobile / tablet screens, automatically close drawer after clicking
    if (window.innerWidth < 1024) {
      onToggleOpen();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay (only on screens < lg when open) */}
      {isOpen && (
        <div 
          onClick={onToggleOpen}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Desktop Collapsed Icon Rail (when !isOpen on >= lg) */}
      {!isOpen && (
        <aside className="hidden lg:flex flex-col items-center py-3 w-16 bg-slate-950/80 backdrop-blur-2xl border-r border-white/10 shrink-0 select-none z-30 h-screen sticky top-0">
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-xl hover:bg-white/5 transition-transform hover:scale-105 mb-2"
            title="Open aspirin Sidebar"
          >
            <img src="/logo.png" alt="aspirin" className="w-8 h-8 object-contain drop-shadow-md" />
          </button>
          <button
            onClick={onToggleOpen}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors mb-6"
            title="Expand Sidebar (⌘S)"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => onChangeView('curriculum')}
              className={`p-2.5 rounded-xl transition-all ${
                activeView === 'curriculum' && !selectedSubject
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Curriculum"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              onClick={() => onChangeView('pearls')}
              className={`p-2.5 rounded-xl transition-all ${
                activeView === 'pearls'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="High-Yield Pearls"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => onChangeView('notes_atlas')}
              className={`p-2.5 rounded-xl transition-all ${
                activeView === 'notes_atlas'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Clinical Practical Atlas"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => onChangeView('bookmarks')}
              className={`p-2.5 rounded-xl transition-all ${
                activeView === 'bookmarks'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Bookmarks"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </aside>
      )}

      {/* Main Sidebar: Responsive Drawer on Mobile/Tablet, Split-View on Desktop */}
      <aside 
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 lg:z-30 w-72 sm:w-80 lg:w-72 bg-slate-950/95 lg:bg-slate-950/70 backdrop-blur-2xl border-r border-white/10 flex flex-col shrink-0 select-none h-screen overflow-hidden transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        {/* Sidebar Header: App Brand + Close Button */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
          <div 
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => handleNavClick('curriculum')}
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="aspirin" 
                className="w-8 h-8 object-contain drop-shadow-md group-hover:scale-105 transition-transform" 
              />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white tracking-tight leading-none flex items-center gap-1.5">
                <span>aspirin</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10">
                  LMS
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                MBBS & NEET-PG
              </div>
            </div>
          </div>

          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Sidebar"
          >
            <span className="lg:hidden"><X className="w-5 h-5" /></span>
            <span className="hidden lg:inline"><PanelLeftClose className="w-4 h-4" /></span>
          </button>
        </div>

        {/* Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Core Navigation Items */}
          <div className="space-y-0.5">
            <button
              onClick={() => handleNavClick('curriculum')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'curriculum' && !selectedSubject
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Curriculum (19 Subjects)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">19</span>
            </button>

            <button
              onClick={() => handleNavClick('pearls')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'pearls'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>High-Yield Pearls</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Exam
              </span>
            </button>

            <button
              onClick={() => handleNavClick('notes_atlas')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'notes_atlas'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Clinical Practical Atlas</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">144</span>
            </button>

            <button
              onClick={() => handleNavClick('bookmarks')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'bookmarks'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <span>Bookmarked Lectures</span>
              </div>
            </button>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-white/5 my-2" />

          {/* 19 MBBS Subjects by Prof Disclosure Groups */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              MBBS Curriculum
            </div>

            {profGroups.map((group) => {
              const isSectionOpen = openSections[group.title];

              return (
                <div key={group.title} className="space-y-1">
                  {/* Section Disclosure Header */}
                  <button
                    onClick={() => toggleSection(group.title)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider transition-colors"
                  >
                    <span>{group.label}</span>
                    {isSectionOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Section Subjects List */}
                  {isSectionOpen && (
                    <div className="space-y-0.5 pl-1">
                      {group.subjects.map((sub) => {
                        const isSelected = selectedSubject?.id === sub.id && activeView === 'curriculum';
                        const progress = sub.progress_percentage || 0;

                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleSubjectClick(sub)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                              isSelected
                                ? 'bg-white/15 text-white shadow-sm'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span 
                                className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border shrink-0"
                                style={{ 
                                  borderColor: `${sub.color}40`, 
                                  backgroundColor: `${sub.color}15`,
                                  color: sub.color 
                                }}
                              >
                                {sub.code}
                              </span>
                              <span className="truncate">{sub.name}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono text-slate-400">
                                {sub.total_topics}
                              </span>
                              {progress > 0 && (
                                <div className="w-3.5 h-3.5 rounded-full border border-emerald-500/40 flex items-center justify-center text-[8px] font-bold text-emerald-400">
                                  {progress}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};
