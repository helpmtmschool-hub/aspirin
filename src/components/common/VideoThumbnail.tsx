import React, { useState } from 'react';
import { Play, Clock, Award } from 'lucide-react';
import { Topic } from '../../types/lms';
import { PLATFORMS, getSubjectVisual } from '../../services/api';

interface VideoThumbnailProps {
  topic: Topic;
  className?: string;
  aspectRatio?: 'video' | 'wide' | 'compact';
  showDuration?: boolean;
  showPlayButton?: boolean;
  showPlatformBadge?: boolean;
  showPearlsBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  topic,
  className = '',
  aspectRatio = 'video',
  showDuration = true,
  showPlayButton = true,
  showPlatformBadge = false,
  showPearlsBadge = false,
  size = 'md',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const thumbUrl = topic.thumbnail_url || `/api/thumbnail/${topic.telegram_chat_id}/${topic.telegram_message_id}`;
  const visual = getSubjectVisual(topic.subject_id);
  const platform = topic.platform_id ? PLATFORMS[topic.platform_id] : null;

  const aspectClass = 
    aspectRatio === 'video' ? 'aspect-video' :
    aspectRatio === 'wide' ? 'aspect-[16/10]' :
    'aspect-[4/3]';

  const playSizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const playIconClasses = {
    sm: 'w-3 h-3 ml-0.5',
    md: 'w-4 h-4 ml-0.5',
    lg: 'w-5 h-5 ml-0.5',
  };

  return (
    <div className={`relative w-full ${aspectClass} bg-[#f5f0e0] overflow-hidden select-none ${className}`}>
      {/* Background Fallback (Graceful editorial gradient + Subject Icon) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f5f0e0] to-[#eae4d2] flex items-center justify-center p-3 text-center">
        <div className="flex flex-col items-center justify-center gap-1 opacity-70">
          <span className="text-2xl filter drop-shadow-sm select-none">{visual.emoji}</span>
          {size !== 'sm' && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#6a6a6a] font-mono line-clamp-1 max-w-[90%]">
              {topic.module || topic.subject_id}
            </span>
          )}
        </div>
      </div>

      {/* Video Thumbnail Image */}
      {!imageError && (
        <img
          src={thumbUrl}
          alt={topic.title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Dark Vignette Overlay for High-Contrast Badge Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />

      {/* Play Button Overlay */}
      {showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`${playSizeClasses[size]} rounded-xl bg-[#0a0a0a]/85 backdrop-blur-sm text-white flex items-center justify-center shadow-md group-hover:scale-110 group-hover:bg-[#0a0a0a] transition-all`}>
            <Play className={`${playIconClasses[size]} fill-white`} />
          </div>
        </div>
      )}

      {/* Platform Badge (Top Left) */}
      {showPlatformBadge && platform && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#0a0a0a]/90 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
          {platform.badge}
        </div>
      )}

      {/* High-Yield Pearls Badge (Top Right) */}
      {showPearlsBadge && topic.pearls && topic.pearls.length > 0 && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-[#e8b94a]/90 backdrop-blur-sm text-[9px] font-bold text-[#3a2700] flex items-center gap-1 shadow-sm">
          <Award className="w-2.5 h-2.5 fill-current" />
          <span>High-Yield</span>
        </div>
      )}

      {/* Duration Badge (Bottom Right) */}
      {showDuration && topic.duration_formatted && (
        <div className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-[#0a0a0a]/85 backdrop-blur-sm text-[10px] font-mono text-white flex items-center gap-1 font-medium border border-white/10 shadow-sm">
          <Clock className="w-2.5 h-2.5 text-[#e5e5e5]" />
          <span>{topic.duration_formatted}</span>
        </div>
      )}
    </div>
  );
};
