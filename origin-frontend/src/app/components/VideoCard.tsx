import { Play, MoreVertical, Clock, Eye } from 'lucide-react';
import Image from 'next/image';
import { Button } from './ui/button';

interface VideoCardProps {
  id: string;
  title: string;
  creator: string;
  thumbnail: string;
  duration: string;
  views: string;
  uploadTime: string;
  isRebel?: boolean;
}

export function VideoCard({
  id,
  title,
  creator,
  thumbnail,
  duration,
  views,
  uploadTime,
  isRebel = false
}: VideoCardProps) {
  return (
    <div className="group cursor-pointer">
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-200"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white px-1.5 py-0.5 rounded text-xs">
          {duration}
        </div>
        
        {/* Rebel badge */}
        {isRebel && (
          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-medium">
            🔥 REBEL
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-white/90 rounded-full p-3">
              <Play className="h-6 w-6 text-gray-800 fill-current" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Video info */}
      <div className="flex gap-3 mt-3">
        {/* Creator avatar */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm">{creator[0].toUpperCase()}</span>
          </div>
        </div>
        
        {/* Video details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 line-clamp-2 leading-tight mb-1">
            {title}
          </h3>
          
          <p className="text-gray-600 text-sm mb-1">
            {creator}
          </p>
          
          <div className="flex items-center text-gray-500 text-sm gap-2">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {views} views
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {uploadTime}
            </span>
          </div>
        </div>
        
        {/* More options */}
        <div className="flex-shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}