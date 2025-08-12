"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VideoCard } from "./VideoCard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, Flame, Shield, Zap } from "lucide-react";

interface VideoGridProps {
  searchQuery?: string;
  section?: string;
  onVideoClick?: (videoId: string) => void;
}

type ApiVideo = {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration?: string;
  views?: number;
  publishedAt?: string;
  channel: { name: string; avatarUrl?: string; verified?: boolean };
  tags?: string[];
  isRebelContent?: boolean;
};

type UiVideo = {
  id: string;
  title: string;
  thumbnail: string;
  creator: { name: string; avatar?: string; isVerified?: boolean };
  views: string;
  uploadTime: string;
  duration: string;
  isRebelContent?: boolean;
  tags?: string[];
};

export function VideoGrid({
  searchQuery,
  section = "home",
  onVideoClick,
}: VideoGridProps) {
  const router = useRouter();

  const [videos, setVideos] = useState<UiVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  // Map API → UI
  const mapVideo = (v: ApiVideo): UiVideo => ({
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnailUrl,
    creator: {
      name: v.channel?.name ?? "Unknown",
      avatar: v.channel?.avatarUrl,
      isVerified: !!v.channel?.verified,
    },
    views: formatViews(v.views),
    uploadTime: timeAgo(v.publishedAt),
    duration: v.duration ?? "0:00",
    isRebelContent:
      typeof v.isRebelContent === "boolean"
        ? v.isRebelContent
        : inferRebelFromTags(v.tags),
    tags: v.tags ?? [],
  });

  const isSearchMode = !!searchQuery || section === "search";

  // Build API path: YouTube proxy for search, internal feed otherwise
  const API_PATH = useMemo(() => {
    const params = new URLSearchParams();
    if (isSearchMode && searchQuery) params.set("q", searchQuery);

    // For your internal feed
    if (!isSearchMode && section && section !== "home") {
      params.set("section", section);
    }

    // Basic pagination; backend can translate this to pageToken if needed
    params.set("page", String(page));
    params.set("limit", "24");

    return isSearchMode
      ? `/api/youtube/search?${params.toString()}`
      : `/api/videos?${params.toString()}`;
  }, [isSearchMode, searchQuery, section, page]);

  // Reset when section/search changes
  useEffect(() => {
    setIsLoading(true);
    setPage(1);
  }, [section, searchQuery]);

  // Fetch when API path / page changes
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch(API_PATH, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = (await res.json()) as ApiVideo[];
        const mapped = json.map(mapVideo);
        setVideos((prev) => (page === 1 ? mapped : [...prev, ...mapped]));
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error(e);
          if (page === 1) setVideos([]);
        }
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    })();

    return () => controller.abort();
  }, [API_PATH, page]);

  const loadMore = () => {
    setLoadingMore(true);
    setPage((p) => p + 1);
  };

  const sectionConfig: Record<
    string,
    {
      title: string;
      subtitle: string;
      icon?: React.ElementType;
      isRebel?: boolean;
    }
  > = {
    home: { title: "Home", subtitle: "Videos curated for rebels like you" },
    trending: { title: "Trending", subtitle: "What's hot on Origin right now" },
    "rebel-trending": {
      title: "Rebel Trending",
      subtitle: "The most rebellious content of the moment",
      icon: Flame,
      isRebel: true,
    },
    "banned-elsewhere": {
      title: "Banned Elsewhere",
      subtitle: "Content censored by corporate platforms",
      icon: Shield,
      isRebel: true,
    },
    underground: {
      title: "Underground",
      subtitle: "Hidden gems from independent creators",
      icon: Zap,
      isRebel: true,
    },
    "anti-corporate": {
      title: "Anti-Corporate",
      subtitle: "Fighting back against the system",
      icon: AlertCircle,
      isRebel: true,
    },
    search: { title: "Search", subtitle: "Results that match your query" },
  };

  const header = isSearchMode
    ? sectionConfig.search
    : sectionConfig[section] ?? sectionConfig.home;
  const Icon = header.icon;

  if (isLoading && page === 1) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Section Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          {Icon && (
            <Icon
              className={`h-6 w-6 ${header.isRebel ? "text-destructive" : ""}`}
            />
          )}
          <h1
            className={`text-2xl font-bold ${
              header.isRebel ? "text-destructive" : ""
            }`}
          >
            {header.title}
          </h1>
          {header.isRebel && (
            <Badge variant="destructive" className="rebel-glow">
              REBEL ZONE
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">{header.subtitle}</p>
      </div>

      {/* Search info */}
      {searchQuery && (
        <div className="mb-4 rounded-lg bg-muted/50 p-4">
          <p>
            Showing results for: <strong>"{searchQuery}"</strong>
            {videos.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                ({videos.length} videos loaded)
              </span>
            )}
          </p>
        </div>
      )}

      {/* No results */}
      {videos.length === 0 && !isLoading ? (
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No videos found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? `No results for "${searchQuery}". Try different keywords.`
              : "No videos available yet."}
          </p>
        </div>
      ) : null}

      {/* Grid */}
      {videos.length > 0 && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {videos.map((v) => (
              <VideoCard
                key={v.id}
                id={v.id}
                title={v.title}
                creator={v.creator}
                thumbnail={v.thumbnail}
                duration={v.duration}
                views={v.views}
                uploadTime={v.uploadTime}
                isRebelContent={!!v.isRebelContent}
                onClick={() =>
                  onVideoClick
                    ? onVideoClick(v.id)
                    : router.push(`/watch/${v.id}`)
                }
              />
            ))}
          </div>

          {/* Load more */}
          <div className="text-center">
            <Button
              onClick={loadMore}
              disabled={loadingMore}
              variant="outline"
              size="lg"
            >
              {loadingMore ? "Loading more…" : "Load More Videos"}
            </Button>
          </div>
        </>
      )}
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

function timeAgo(iso?: string) {
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

function inferRebelFromTags(tags?: string[]) {
  if (!tags?.length) return false;
  const hot = [
    "rebel",
    "banned",
    "censorship",
    "underground",
    "anti-corporate",
    "truth",
  ];
  return tags.some((t) => hot.includes(t.toLowerCase()));
}
