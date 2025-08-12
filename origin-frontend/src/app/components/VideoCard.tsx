"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  MoreVertical,
  Clock,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share,
  Plus,
  Flame,
} from "lucide-react";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  creator: {
    name: string;
    avatar?: string;
    isVerified?: boolean;
  };
  views: string;
  uploadTime: string;
  duration: string;
  isRebelContent?: boolean;
  isBannedElsewhere?: boolean;
  likes?: number;
  comments?: number;
  tags?: string[];
  onClick?: () => void;
  onCreatorClick?: () => void;
  onAddToPlaylist?: () => void;
  onShare?: () => void;
}

export function VideoCard({
  id,
  title,
  thumbnail,
  creator,
  views,
  uploadTime,
  duration,
  isRebelContent = false,
  isBannedElsewhere = false,
  likes = 0,
  comments = 0,
  tags = [],
  onClick,
  onCreatorClick,
  onAddToPlaylist,
  onShare,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  return (
    <div
      className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-video overflow-hidden bg-muted"
        onClick={onClick}
      >
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {duration}
        </div>

        {/* Rebel/Banned badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isRebelContent && (
            <Badge variant="destructive" className="text-xs rebel-glow">
              <Flame className="h-3 w-3 mr-1" />
              REBEL
            </Badge>
          )}
          {isBannedElsewhere && (
            <Badge
              variant="secondary"
              className="text-xs bg-yellow-500 text-black"
            >
              BANNED ELSEWHERE
            </Badge>
          )}
        </div>

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 hover:bg-white"
              aria-label="Watch now"
              onClick={(e) => {
                e.stopPropagation(); // avoid triggering parent card click
                router.push(`/player?v=${id}`); // navigate to player
              }}
            >
              Watch Now
            </Button>
          </div>
        )}

        {/* Quick actions on hover */}
        {isHovered && (
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddToPlaylist}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to playlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShare}>
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Clock className="mr-2 h-4 w-4" />
                  Save for later
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Creator Avatar */}
          <button
            onClick={onCreatorClick}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={creator.avatar} alt={creator.name} />
              <AvatarFallback className="text-xs">
                {creator.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </button>

          {/* Video Details */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-medium line-clamp-2 text-sm leading-snug mb-1 cursor-pointer hover:text-destructive transition-colors"
              onClick={onClick}
            >
              {title}
            </h3>

            <button
              onClick={onCreatorClick}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              {creator.name}
              {creator.isVerified && (
                <span className="ml-1 text-blue-500">✓</span>
              )}
            </button>

            <div className="flex items-center text-xs text-muted-foreground mb-2">
              <Eye className="h-3 w-3 mr-1" />
              <span>{views} views</span>
              <span className="mx-1">•</span>
              <span>{uploadTime}</span>
            </div>

            {/* Engagement Stats */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                <span>{likes > 0 ? likes : ""}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                <span>{comments > 0 ? comments : ""}</span>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.slice(0, 3).map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs px-1 py-0"
                  >
                    #{tag}
                  </Badge>
                ))}
                {tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
