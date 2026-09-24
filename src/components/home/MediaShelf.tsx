import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Topic, UserProgressItem } from '../../types/lms';
import { PLATFORMS, getSubjectVisual } from '../../services/api';
import { VideoThumbnail } from '../common/VideoThumbnail';

interface MediaShelfProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  topics: Topic[];
  progressMap?: Record<string, UserProgressItem>;
  onSelectTopic: (topic: Topic) => void;
}

export const MediaShelf: React.FC<MediaShelfProps> = ({
  title,
  subtitle,
  icon,
  topics,
  progressMap = {},
  onSelectTopic,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!topics || topics.length === 0) return null;

  return (
    <section className="space-y-4 relative group/shelf">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a0a0a] font-display flex items-center gap-2.5">
            {icon}
            {title}
          </h3>
          {subtitle && <p className="text-xs sm:text-sm text-[#6a6a6a]">{subtitle}</p>}
        </div>

        {/* Scroll Controls */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover/shelf:opacity-100 transition-opacity">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('left')}
            className="p-2 rounded-xl border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] transition"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => scroll('right')}
            className="p-2 rounded-xl border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] transition"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Horizontal Carousel with Clay Feature Cards */}
      <div
        ref={rowRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {topics.map((topic) => {
          const platform = topic.platform_id ? PLATFORMS[topic.platform_id] : null;
          const prog = progressMap[topic.id];
          const hasWatched = prog && prog.watchedSeconds > 10;
          const totalSecs = prog?.totalSeconds || topic.duration_seconds || 1800;
          const pct = hasWatched ? Math.min(100, Math.round((prog.watchedSeconds / totalSecs) * 100)) : 0;

          return (
            <motion.div
              key={topic.id}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectTopic(topic)}
              className="flex-shrink-0 w-64 sm:w-72 rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] hover:bg-[#f5f0e0] cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              {/* Thumbnail Area */}
              <div className="relative w-full border-b border-[#e5e5e5] overflow-hidden">
                <VideoThumbnail
                  topic={topic}
                  showPlatformBadge={true}
                  showDuration={true}
                  showPlayButton={true}
                  size="md"
                />

                {/* Progress bar on bottom of thumbnail */}
                {hasWatched && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e5e5e5] z-20">
                    <div 
                      className="h-full bg-[#ff4d8b]" 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                <div className="text-[10px] uppercase font-bold text-[#6a6a6a] font-mono flex items-center gap-1.5">
                  <span>{getSubjectVisual(topic.subject_id).emoji}</span>
                  <span>{topic.subject_id}</span>
                  {topic.module && <span> • {topic.module}</span>}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-[#0a0a0a] font-display line-clamp-2 leading-snug">
                  {topic.title}
                </h4>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
