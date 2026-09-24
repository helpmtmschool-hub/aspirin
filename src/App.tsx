import React, { useState, useEffect } from 'react';
import { AuthProvider, useAppUser } from './components/auth/AuthProvider';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { SearchModal } from './components/layout/SearchModal';
import { HeroContinueWatching } from './components/home/HeroContinueWatching';
import { MediaShelf } from './components/home/MediaShelf';
import { MasterNotesShelf } from './components/home/MasterNotesShelf';
import { SubjectGrid } from './components/study/SubjectGrid';
import { PlatformClassroom } from './components/classroom/PlatformClassroom';
import { VideoPlayer } from './components/viewer/VideoPlayer';
import { NotesReader } from './components/viewer/NotesReader';
import { LMSApiService } from './services/api';
import { ProgressService } from './services/progress';
import { DeviceGuard } from './components/security/DeviceGuard';
import { Subject, Topic, NoteItem, PlatformId, UserProgressItem } from './types/lms';
import { Award, Film, Bookmark, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoThumbnail } from './components/common/VideoThumbnail';

export const AppContent: React.FC = () => {
  const { user, getToken } = useAppUser();
  const [activeTab, setActiveTab] = useState<'home' | 'study' | 'bookmarks'>('home');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync Clerk authentication with ProgressService & trigger remote cloud sync
  useEffect(() => {
    const userId = user?.id || 'aspirin_guest';
    ProgressService.setAuth(userId, getToken);
    ProgressService.syncRemoteProgress(userId).then(() => {
      refreshProgress();
    });
  }, [user?.id, getToken]);

  // Keep Continue Watching & bookmarks in sync whenever cloud updates
  useEffect(() => {
    const unsubscribe = ProgressService.onSyncStatusChange((status) => {
      if (status === 'synced') {
        refreshProgress();
      }
    });
    return unsubscribe;
  }, [subjects]);

  // Home Shelves State
  const [curatedFeed, setCuratedFeed] = useState<{
    highYieldLectures: Topic[];
    firstProfPicks: Topic[];
    clinicalPicks: Topic[];
    masterBooks: NoteItem[];
  }>({
    highYieldLectures: [],
    firstProfPicks: [],
    clinicalPicks: [],
    masterBooks: [],
  });

  const [continueWatchingList, setContinueWatchingList] = useState<{ topic: Topic; progress: UserProgressItem }[]>([]);
  const [bookmarkedTopics, setBookmarkedTopics] = useState<Topic[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgressItem>>({});

  // Active Modals & Viewers State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [classroomSubject, setClassroomSubject] = useState<Subject | null>(null);
  const [classroomPlatform, setClassroomPlatform] = useState<PlatformId>('prepx_en');
  const [activePlayerTopic, setActivePlayerTopic] = useState<Topic | null>(null);
  const [activePlayerPlaylist, setActivePlayerPlaylist] = useState<Topic[]>([]);
  const [activeReaderNote, setActiveReaderNote] = useState<NoteItem | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [subs, feed] = await Promise.all([
        LMSApiService.getSubjects(),
        LMSApiService.getCuratedFeed(),
      ]);
      setSubjects(subs);
      setCuratedFeed(feed);

      // Extract all topics for continue watching
      const allTopics: Topic[] = [];
      subs.forEach((s) => {
        Object.values(s.platform_data || {}).forEach((p) => {
          p.modules.forEach((m) => allTopics.push(...m.topics));
        });
      });

      const inProgress = ProgressService.getContinueWatching(allTopics);
      setContinueWatchingList(inProgress);
      setBookmarkedTopics(ProgressService.getBookmarks());
      setProgressMap(ProgressService.getLocalProgress());
    } catch (e) {
      console.error('Failed to load catalog:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSubject = (subject: Subject, platformId?: PlatformId) => {
    const chosenPlatform = 
      platformId || 
      (subject.available_platforms && subject.available_platforms.length > 0 
        ? subject.available_platforms[0] 
        : 'prepx_en');
    setClassroomSubject(subject);
    setClassroomPlatform(chosenPlatform);
    setActiveTab('study');
  };

  const handlePlayTopic = (topic: Topic, playlist?: Topic[]) => {
    setActivePlayerTopic(topic);
    setActivePlayerPlaylist(playlist && playlist.length > 0 ? playlist : [topic]);
  };

  const refreshProgress = () => {
    const localProg = ProgressService.getLocalProgress();
    setProgressMap(localProg);
    setBookmarkedTopics(ProgressService.getBookmarks());

    // Recompute continue watching list immediately
    const allTopics: Topic[] = [];
    subjects.forEach((s) => {
      Object.values(s.platform_data || {}).forEach((p) => {
        p.modules.forEach((m) => allTopics.push(...m.topics));
      });
    });
    setContinueWatchingList(ProgressService.getContinueWatching(allTopics));
  };

  return (
    <div className="min-h-screen bg-[#fffaf0] text-[#0a0a0a] flex flex-col selection:bg-[#ffb084] selection:text-[#0a0a0a]">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'study') {
            setClassroomSubject(null);
          }
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 md:pb-16 space-y-12">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 rounded-full border-3 border-[#0a0a0a] border-t-transparent animate-spin" />
            <p className="text-sm font-mono text-[#6a6a6a]">Loading Aspirin Clinical Catalog...</p>
          </div>
        ) : (
          <>
            {/* ANIMATED VIEW ROUTER WITH CLAY MOTION */}
            <AnimatePresence mode="wait">
              {/* VIEW 1: HOME (CLAY SATURATED FEATURE FEED) */}
              {activeTab === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                  className="space-y-14"
                >
                  {/* Hero Banner: Clay 7-5 Band */}
                  <HeroContinueWatching
                    item={continueWatchingList.length > 0 ? continueWatchingList[0] : null}
                    onPlay={(topic) => handlePlayTopic(topic, continueWatchingList.map(i => i.topic))}
                    onExplore={() => setActiveTab('study')}
                  />

                  {/* Shelf 1: Continue Watching (if multiple in-progress) */}
                  {continueWatchingList.length > 1 && (
                    <MediaShelf
                      title="Continue Studying"
                      subtitle="Resume your clinical study sessions"
                      icon={<Film className="w-5 h-5 text-[#ff4d8b]" />}
                      topics={continueWatchingList.slice(1).map((item) => item.topic)}
                      progressMap={progressMap}
                      onSelectTopic={(topic) => handlePlayTopic(topic, continueWatchingList.map(i => i.topic))}
                    />
                  )}

                  {/* Shelf 2: 24 Master Clinical Review Books */}
                  <MasterNotesShelf
                    books={curatedFeed.masterBooks}
                    onSelectNote={(note) => setActiveReaderNote(note)}
                  />

                  {/* Shelf 3: High-Yield Grand Rounds */}
                  <MediaShelf
                    title="High-Yield Clinical Grand Rounds"
                    subtitle="Core topics tested repeatedly in NEET PG and INI-CET"
                    icon={<Award className="w-5 h-5 text-[#e8b94a]" />}
                    topics={curatedFeed.highYieldLectures}
                    progressMap={progressMap}
                    onSelectTopic={(topic) => handlePlayTopic(topic, curatedFeed.highYieldLectures)}
                  />

                  {/* Shelf 4: Final Prof Clinical Medicine & Surgery */}
                  <MediaShelf
                    title="Final Prof: Clinical Specialties"
                    subtitle="General Medicine, General Surgery, OBG & Pediatrics"
                    icon={<BookOpen className="w-5 h-5 text-[#1a3a3a]" />}
                    topics={curatedFeed.clinicalPicks}
                    progressMap={progressMap}
                    onSelectTopic={(topic) => handlePlayTopic(topic, curatedFeed.clinicalPicks)}
                  />

                  {/* Shelf 5: 1st Prof Fundamentals */}
                  <MediaShelf
                    title="1st Prof: Pre-Clinical Essentials"
                    subtitle="Anatomy, Physiology & Biochemistry Foundations"
                    icon={<BookOpen className="w-5 h-5 text-[#ffb084]" />}
                    topics={curatedFeed.firstProfPicks}
                    progressMap={progressMap}
                    onSelectTopic={(topic) => handlePlayTopic(topic, curatedFeed.firstProfPicks)}
                  />
                </motion.div>
              )}

              {/* VIEW 2: STUDY HUB (19 MBBS SUBJECTS OR PLATFORM CLASSROOM) */}
              {activeTab === 'study' && (
                <motion.div
                  key="study"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                >
                  {classroomSubject ? (
                    <PlatformClassroom
                      subject={classroomSubject}
                      initialPlatform={classroomPlatform}
                      onBack={() => setClassroomSubject(null)}
                      onPlayTopic={handlePlayTopic}
                      onOpenNote={(note) => setActiveReaderNote(note)}
                    />
                  ) : (
                    <SubjectGrid
                      subjects={subjects}
                      onSelectSubject={handleSelectSubject}
                    />
                  )}
                </motion.div>
              )}

              {/* VIEW 3: SAVED BOOKMARKS */}
              {activeTab === 'bookmarks' && (
                <motion.div
                  key="bookmarks"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] font-display flex items-center gap-2.5">
                      <Bookmark className="w-6 h-6 text-[#e8b94a]" />
                      Saved Bookmarks ({bookmarkedTopics.length})
                    </h2>
                    <p className="text-xs sm:text-sm text-[#6a6a6a]">
                      Your bookmarked high-yield lectures and clinical review points.
                    </p>
                  </div>

                  {bookmarkedTopics.length === 0 ? (
                    <div className="py-20 text-center text-[#6a6a6a] space-y-3 bg-[#faf5e8] rounded-[24px] border border-[#e5e5e5]">
                      <Bookmark className="w-10 h-10 text-[#0a0a0a] opacity-30 mx-auto" />
                      <p className="text-sm font-semibold text-[#0a0a0a]">No bookmarked lectures yet.</p>
                      <p className="text-xs text-[#6a6a6a]">Click the bookmark icon while watching any lecture to save it here for fast revision.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {bookmarkedTopics.map((topic) => (
                        <motion.div
                          key={topic.id}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActivePlayerTopic(topic)}
                          className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] hover:bg-[#f5f0e0] cursor-pointer shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between overflow-hidden"
                        >
                          <div className="w-full border-b border-[#e5e5e5]">
                            <VideoThumbnail
                              topic={topic}
                              size="md"
                              showDuration={true}
                              showPlayButton={true}
                            />
                          </div>
                          <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] font-mono">
                                {topic.subject_id} • {topic.module}
                              </span>
                              <h4 className="text-sm font-bold text-[#0a0a0a] font-display group-hover:text-[#ff4d8b] line-clamp-2 transition-colors mt-1">
                                {topic.title}
                              </h4>
                            </div>
                            <div className="pt-3 border-t border-[#e5e5e5]/80 mt-3 flex items-center justify-between text-xs text-[#6a6a6a] font-mono">
                              <span>{topic.duration_formatted}</span>
                              <span className="text-[#0a0a0a] group-hover:underline font-bold font-sans">
                                Watch Lecture →
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Clay Signature Cream Footer */}
      <footer className="bg-[#faf5e8] border-t border-[#e5e5e5] py-16 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-[#6a6a6a]">
          <div className="flex items-center gap-3">
            <img src="/logo-main.png" alt="Aspirin" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-bold text-sm text-[#0a0a0a] font-display">Aspirin</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a]">
              Clinical Education
            </span>
          </div>
          <p>© 2026 Aspirin. Comprehensive digital learning for medical students and exam aspirants.</p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'study') {
            setClassroomSubject(null);
          }
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Spotlight Search Modal (Cmd+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTopic={(topic) => setActivePlayerTopic(topic)}
        onSelectNote={(note) => setActiveReaderNote(note)}
        onSelectSubject={(subject) => {
          setClassroomSubject(subject);
          setClassroomPlatform('prepx_en');
          setActiveTab('study');
        }}
      />

      {/* Edge-Accelerated Video Player */}
      {activePlayerTopic && (
        <VideoPlayer
          topic={activePlayerTopic}
          playlist={activePlayerPlaylist}
          onSelectTopic={(t) => handlePlayTopic(t, activePlayerPlaylist)}
          onClose={() => {
            setActivePlayerTopic(null);
            refreshProgress();
          }}
        />
      )}

      {/* Secure In-App Notes PDF Viewer */}
      {activeReaderNote && (
        <NotesReader
          note={activeReaderNote}
          onClose={() => setActiveReaderNote(null)}
        />
      )}

      {/* 1-Device Active Session Policy Guard */}
      <DeviceGuard />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
