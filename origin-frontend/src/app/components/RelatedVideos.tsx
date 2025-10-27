"use client";

import { useEffect, useState } from "react";
// import { useParams } from "next/navigation";
// import { VideoCard } from "./VideoCard";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "https://originvideo.duckdns.org";

type RelatedVideo = {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: string;
  views: number;
  publishedAt: string;
  channel: { name: string; avatarUrl?: string; verified?: boolean };
  tags?: string[];
  isRebelContent?: boolean;
};

interface RelatedVideosProps {
  videoId: string;
}

export function RelatedVideos({ videoId }: RelatedVideosProps) {
  const [videos, setVideos] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelatedVideos = async () => {
      try {
        const response = await fetch(`${API_BASE}/videos/${videoId}/related?limit=8`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch related videos: ${response.status}`);
        }

        const data = await response.json();
        setVideos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load related videos");
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedVideos();
  }, [videoId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium">Related Videos</h3>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-40 h-24 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium">Related Videos</h3>
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {error || "No related videos available"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Related Videos</h3>
      <div className="space-y-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className="flex gap-3 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded transition-colors"
            onClick={() => window.location.href = `/watch/${video.id}`}
          >
            {/* Thumbnail */}
            <div className="w-40 h-24 flex-shrink-0">
              <div className="relative w-full h-full rounded overflow-hidden">
                <img
                  src={`${API_BASE}${video.thumbnailUrl}`}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/thumbnail-placeholder.jpg';
                  }}
                />
                {video.duration !== "0:00" && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {video.duration}
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 mb-1 leading-tight">
                {video.title}
              </h4>
              
              {/* Channel */}
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                <span>{video.channel.name}</span>
                {video.channel.verified && (
                  <span className="text-blue-500">✓</span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatViews(video.views)} views</span>
                <span>•</span>
                <span>{timeAgo(video.publishedAt)}</span>
              </div>

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {video.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {video.tags.length > 2 && (
                    <span className="text-xs text-gray-500">+{video.tags.length - 2}</span>
                  )}
                </div>
              )}

              {/* Rebel badge */}
              {video.isRebelContent && (
                <div className="mt-1">
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    REBEL
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function formatViews(n: number | undefined) {
  if (!n && n !== 0) return "—";
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  if (n < 1_000_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
}

function timeAgo(iso: string | undefined) {
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(months / 12);
  return `${years} yr${years > 1 ? "s" : ""} ago`;
}
