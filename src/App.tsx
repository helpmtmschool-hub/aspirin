import React, { useState, useEffect } from 'react';
import { 
  Subject, 
  Topic, 
  NoteItem, 
  MBBSProf, 
  LMSTheme,
  UserNote 
} from './types/lms';
import { LMSApiService } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { SubjectGrid } from './components/SubjectGrid';
import { ModuleView } from './components/ModuleView';
import { VideoPlayer } from './components/VideoPlayer';
import { NotesViewer } from './components/NotesViewer';
import { SearchModal } from './components/SearchModal';
import { PearlsCenter } from './components/PearlsCenter';
import { NotesAtlas } from './components/NotesAtlas';
import { 
  Cloud, 
  Radio, 
  Bookmark, 
  Play, 
  CheckCircle2, 
  BookOpen,
  FolderOpen
} from 'lucide-react';

export const App: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProf, setCurrentProf] = useState<MBBSProf | 'all'>('all');
  const [currentTheme, setCurrentTheme] = useState<LMSTheme>('marrow');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  // Active navigation view: 'curriculum' | 'pearls' | 'notes_atlas' | 'bookmarks'
  const [activeView, setActiveView] = useState<'curriculum' | 'pearls' | 'notes_atlas' | 'bookmarks'>('curriculum');

  // Active content states
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjectModules, setSubjectModules] = useState<any[]>([]);
  const [subjectNotes, setSubjectNotes] = useState<NoteItem[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [recentTopic, setRecentTopic] = useState<Topic | null>(null);
  const [bookmarkedTopics, setBookmarkedTopics] = useState<Topic[]>([]);

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
    loadBookmarks();
  }, []);

  const loadSubjects = async () => {
    setIsLoading(true);
    try {
      const data = await LMSApiService.getSubjects();
      setSubjects(data);

      // Check for most recent topic
      const local = LMSApiService.getLocalProgress();
      let latestTime = 0;
      let latestId = '';
      for (const [id, val] of Object.entries(local)) {
        if (val.lastWatchedAt) {
          const t = new Date(val.lastWatchedAt).getTime();
          if (t > latestTime) {
            latestTime = t;
            latestId = id;
          }
        }
      }

      if (latestId) {
        try {
          const t = await LMSApiService.getTopic(latestId);
          setRecentTopic(t);
        } catch {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const b = await LMSApiService.getBookmarks();
      setBookmarkedTopics(b);
    } catch {}
  };

  // Keyboard shortcut listener for Sidebar (⌘S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Select Subject
  const handleSelectSubject = async (sub: Subject) => {
    setSelectedTopic(null);
    setSelectedNote(null);
    setSelectedSubject(sub);
    setActiveView('curriculum');
    try {
      const details = await LMSApiService.getSubject(sub.id);
      setSubjectModules(details.modules || []);
      setSubjectNotes(details.notes || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Select Topic (Video Lecture)
  const handleSelectTopic = async (topic: Topic) => {
    setSelectedNote(null);
    setSelectedTopic(topic);
    setRecentTopic(topic);

    // If subject not currently loaded, load its notes for slide sync
    if (topic.subject_id && (!selectedSubject || selectedSubject.id !== topic.subject_id)) {
      try {
        const details = await LMSApiService.getSubject(topic.subject_id);
        setSubjectNotes(details.notes || []);
      } catch {}
    }
  };

  // Select Note (PDF)
  const handleSelectNote = (note: NoteItem) => {
    setSelectedTopic(null);
    setSelectedNote(note);
  };

  // Save Progress
  const handleSaveProgress = async (
    topicId: string,
    watched: number,
    total: number,
    completed: boolean
  ) => {
    await LMSApiService.saveProgress(topicId, watched, total, completed);

    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic((prev) =>
        prev
          ? {
              ...prev,
              watched_seconds: watched,
              is_completed: completed,
            }
          : null
      );
    }

    setSubjectModules((prev) =>
      prev.map((m) => ({
        ...m,
        topics: m.topics.map((t: Topic) =>
          t.id === topicId ? { ...t, is_completed: completed, watched_seconds: watched } : t
        ),
      }))
    );
  };

  // Toggle Bookmark
  const handleToggleBookmark = async (topicId: string, current: boolean) => {
    const newVal = !current;
    await LMSApiService.saveProgress(topicId, 0, 1800, false, newVal);

    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic((prev) => (prev ? { ...prev, is_bookmarked: newVal } : null));
    }

    setSubjectModules((prev) =>
      prev.map((m) => ({
        ...m,
        topics: m.topics.map((t: Topic) =>
          t.id === topicId ? { ...t, is_bookmarked: newVal } : t
        ),
      }))
    );

    loadBookmarks();
  };

  // Save User Clinical Note
  const handleSaveUserNote = async (
    topicId: string,
    timestamp: number,
    text: string
  ): Promise<UserNote> => {
    return await LMSApiService.saveUserNote(topicId, timestamp, text);
  };

  // Return home
  const handleGoHome = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSelectedNote(null);
    setActiveView('curriculum');
    loadSubjects();
    loadBookmarks();
  };

  // Flatten module topics for player playlist
  const currentModuleTopics: Topic[] = [];
  subjectModules.forEach((m) => {
    (m.topics || []).forEach((t: Topic) => currentModuleTopics.push(t));
  });

  return (
    <div className={`min-h-screen flex bg-slate-950 text-slate-100 ${
      currentTheme === 'marrow' ? 'theme-marrow' : 'theme-prepladder'
    }`}>
      {/* 1. macOS Sequoia Split-View Sidebar */}
      <Sidebar
        subjects={subjects}
        selectedSubject={selectedSubject}
        onSelectSubject={handleSelectSubject}
        activeView={activeView}
        onChangeView={(view) => {
          setActiveView(view);
          setSelectedTopic(null);
          setSelectedNote(null);
          if (view !== 'curriculum') {
            setSelectedSubject(null);
          }
          if (view === 'bookmarks') {
            loadBookmarks();
          }
        }}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
        currentTheme={currentTheme}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Floating Apple Liquid Glass Toolbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenSearch={() => setIsSearchOpen(true)}
          currentTheme={currentTheme}
          onToggleTheme={(t) => setCurrentTheme(t)}
          selectedSubject={selectedSubject}
          onGoHome={handleGoHome}
          activeView={activeView}
        />

        {/* Workspace Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-28 space-y-4">
              <div className={`w-10 h-10 rounded-2xl animate-spin border-3 border-t-transparent ${
                currentTheme === 'marrow' ? 'border-teal-500' : 'border-indigo-500'
              }`} />
              <div className="text-xs font-semibold text-slate-300">
                Loading 19 MBBS Subjects & Telegram Repository...
              </div>
            </div>
          ) : selectedTopic ? (
            /* View 1: Clinical Cinema Video Player with Floating Clear Liquid Glass Controls */
            <VideoPlayer
              topic={selectedTopic}
              moduleTopics={currentModuleTopics.length > 0 ? currentModuleTopics : [selectedTopic]}
              subjectName={selectedSubject?.name || (selectedTopic as any).subject_name || 'General Medicine'}
              onBack={() => setSelectedTopic(null)}
              onSelectTopic={handleSelectTopic}
              onSaveProgress={handleSaveProgress}
              onToggleBookmark={handleToggleBookmark}
              onSaveUserNote={handleSaveUserNote}
              currentTheme={currentTheme}
              subjectNotes={subjectNotes}
            />
          ) : selectedNote ? (
            /* View 2: Clinical PDF & OSCE Reader */
            <NotesViewer
              note={selectedNote}
              subjectName={selectedSubject?.name || (selectedNote as any).subjectName || 'Clinical Practical'}
              onClose={() => setSelectedNote(null)}
              currentTheme={currentTheme}
            />
          ) : activeView === 'pearls' ? (
            /* View 3: High-Yield Clinical Pearls Center & Active Recall */
            <PearlsCenter
              onSelectTopic={handleSelectTopic}
              currentTheme={currentTheme}
            />
          ) : activeView === 'notes_atlas' ? (
            /* View 4: Clinical Practical Atlas (144 PDFs) */
            <NotesAtlas
              onSelectNote={handleSelectNote}
              currentTheme={currentTheme}
            />
          ) : activeView === 'bookmarks' ? (
            /* View 5: Bookmarked Lectures View */
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Saved For Revision
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Bookmarked Lectures
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-yield lectures and topics pinned for active recall and pre-exam drills.
                </p>
              </div>

              {bookmarkedTopics.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/40 border border-white/5 rounded-2xl">
                  <Bookmark className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-300">No bookmarks saved yet</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click the bookmark icon on any lecture row or video player to pin it here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {bookmarkedTopics.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => handleSelectTopic(topic)}
                      className="bg-slate-900/50 hover:bg-slate-900/80 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3 group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/10">
                            {(topic as any).subject_name || topic.subject_id}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {topic.duration_formatted || '30m'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-2">
                          {topic.title}
                        </h4>
                      </div>

                      <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {topic.file_size_mb ? `${topic.file_size_mb} MB` : 'Stream Ready'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBookmark(topic.id, true);
                            }}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-white/10 transition-colors"
                            title="Remove Bookmark"
                          >
                            <Bookmark className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 group-hover:bg-white/20 text-white transition-colors flex items-center gap-1">
                            <Play className="w-3 h-3 fill-current" />
                            <span>Resume</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : selectedSubject ? (
            /* View 6: Subject Module & Chapter Disclosure View */
            <ModuleView
              subject={selectedSubject}
              modules={subjectModules}
              notes={subjectNotes}
              onBack={() => setSelectedSubject(null)}
              onSelectTopic={handleSelectTopic}
              onSelectNote={handleSelectNote}
              onToggleBookmark={handleToggleBookmark}
              currentTheme={currentTheme}
            />
          ) : (
            /* View 7: Apple HIG 19 MBBS Subjects Catalog */
            <SubjectGrid
              subjects={subjects}
              currentProf={currentProf}
              onSelectProf={(p) => setCurrentProf(p)}
              onSelectSubject={handleSelectSubject}
              currentTheme={currentTheme}
              recentTopic={recentTopic}
              onResumeTopic={handleSelectTopic}
            />
          )}
        </main>

        {/* Global Apple Spotlight Search Palette (⌘K) */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectTopic={handleSelectTopic}
          onSelectNote={handleSelectNote}
          currentTheme={currentTheme}
        />

        {/* Medical Desktop Footer */}
        <footer className="border-t border-white/5 bg-slate-950/80 px-4 sm:px-8 py-4 text-xs text-slate-400 select-none">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="aspirin" className="w-4 h-4 object-contain" />
              <span className="font-bold text-slate-300">aspirin LMS</span>
              <span>•</span>
              <span>Apple HIG & Liquid Glass • Marrow Architecture</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span>Cloudflare Pages & D1</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>Turbo Telegram MTProto Streamer</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
