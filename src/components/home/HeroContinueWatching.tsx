import React from 'react';
import { Play, Sparkles, CheckCircle2, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { Topic, UserProgressItem } from '../../types/lms';
import { PLATFORMS, getSubjectVisual } from '../../services/api';
import { VideoThumbnail } from '../common/VideoThumbnail';

interface HeroContinueWatchingProps {
  item: { topic: Topic; progress: UserProgressItem } | null;
  onPlay: (topic: Topic) => void;
  onExplore: () => void;
}

export const HeroContinueWatching: React.FC<HeroContinueWatchingProps> = ({
  item,
  onPlay,
  onExplore,
}) => {
  if (!item) {
    // Clay Signature 7-5 Hero Band
    return (
      <div className="relative rounded-[24px] bg-[#faf5e8] border border-[#e5e5e5] p-8 sm:p-12 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column (7 cols): Editorial Typography */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#ff4d8b]" />
              Cloud-Native Medical Education
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#0a0a0a] font-display leading-[1.08]">
              Master 19 MBBS Subjects with High-Yield Faculty.
            </h1>

            <p className="text-[#3a3a3a] text-sm sm:text-base leading-relaxed max-w-xl">
              Study PrepLadder Edition X and Cerebellum Academy video lectures and clinical review textbooks, streamed with zero latency via Microsoft SharePoint Azure CDN.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onExplore}
                className="clay-btn-primary"
              >
                <Play className="w-4 h-4 fill-white" />
                Explore 19 Subjects
              </motion.button>
            </div>
          </div>

          {/* Right Column (5 cols): Saturated Clay Feature Card */}
          <div className="lg:col-span-5">
            <div className="rounded-[24px] bg-[#1a3a3a] text-white p-7 space-y-4 shadow-sm relative overflow-hidden">
              {/* Subtle decorative stamp */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold">
                <BookOpen className="w-3.5 h-3.5 text-[#ffb084]" />
                Featured Curriculum
              </div>

              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-[#a4d4c5] font-bold">
                  PrepLadder Edition X
                </span>
                <h3 className="text-xl font-bold leading-snug">
                  Neuroanatomy & Clinical Cardiology
                </h3>
              </div>

              <p className="text-xs text-white/80 leading-relaxed">
                84 high-yield lectures by Dr. Deepak Marwah and senior clinical faculty are cloud-ready on Azure CDN.
              </p>

              <div className="pt-2">
                <button
                  onClick={onExplore}
                  className="clay-btn-on-color w-full"
                >
                  <Play className="w-3.5 h-3.5 fill-[#0a0a0a]" />
                  Start PrepLadder Track
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { topic, progress } = item;
  const platform = topic.platform_id ? PLATFORMS[topic.platform_id] : null;

  const total = progress.totalSeconds || topic.duration_seconds || 1800;
  const watched = progress.watchedSeconds || 0;
  const percent = Math.min(100, Math.round((watched / total) * 100));
  const remainingMins = Math.max(1, Math.round((total - watched) / 60));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative rounded-[24px] bg-[#faf5e8] border border-[#e5e5e5] p-6 sm:p-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Title & Progress */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f0e0] border border-[#e5e5e5] text-[#0a0a0a] text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-[#ff4d8b] animate-ping" />
              Continue Studying
            </span>

            {platform && (
              <span className="px-2.5 py-1 rounded-full bg-[#e8b94a]/20 border border-[#e8b94a]/40 text-[#0a0a0a] text-xs font-semibold">
                {platform.shortName}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 capitalize px-2.5 py-1 rounded-full bg-[#fffaf0] border border-[#e5e5e5] text-[#3a3a3a] text-xs font-medium">
              <span>{getSubjectVisual(topic.subject_id).emoji}</span>
              <span>{topic.subject_id.replace(/_/g, ' ')}</span>
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-[#0a0a0a] font-display leading-tight">
            {topic.title}
          </h2>

          {topic.module && (
            <p className="text-[#6a6a6a] text-xs sm:text-sm font-medium">
              Module: <span className="text-[#0a0a0a] font-semibold">{topic.module}</span>
            </p>
          )}

          {/* Clean Clay Progress Track */}
          <div className="space-y-1.5 pt-2 max-w-md">
            <div className="flex items-center justify-between text-xs text-[#6a6a6a] font-mono">
              <span>{formatTime(watched)} watched ({percent}%)</span>
              <span>{remainingMins}m remaining</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#ebe6d6] overflow-hidden">
              <motion.div 
                className="h-full bg-[#0a0a0a] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPlay(topic)}
              className="clay-btn-primary"
            >
              <Play className="w-4 h-4 fill-white" />
              Resume Lecture
            </motion.button>
          </div>
        </div>

        {/* Right Column: Video Preview & Clinical Pearls */}
        <div className="lg:col-span-5 space-y-4">
          <div 
            onClick={() => onPlay(topic)}
            className="cursor-pointer group rounded-[20px] overflow-hidden border border-[#e5e5e5] shadow-sm hover:shadow-md transition-shadow"
          >
            <VideoThumbnail
              topic={topic}
              size="lg"
              showDuration={true}
              showPlayButton={true}
              showPearlsBadge={true}
            />
          </div>

          <div className="rounded-[20px] bg-[#b8a4ed]/25 p-5 text-[#0a0a0a] border border-[#b8a4ed]/40 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="uppercase tracking-wider font-mono">Clinical Pearls</span>
              <Sparkles className="w-3.5 h-3.5 text-[#5e38ba]" />
            </div>

            <div className="space-y-1.5">
              {(topic.pearls && topic.pearls.length > 0 ? topic.pearls.slice(0, 2) : [
                "Focus on clinical presentation and diagnostic criteria.",
                "Review high-yield PYQ points before taking the subject test."
              ]).map((pearl, idx) => (
                <div key={idx} className="p-2 rounded-xl bg-white/70 text-xs font-medium text-[#1a1a1a] flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0a0a0a] shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{pearl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
