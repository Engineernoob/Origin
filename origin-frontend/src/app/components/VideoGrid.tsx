"use client";

import { useState, useEffect } from "react";
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

interface MockVideo {
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
}

export function VideoGrid({
  searchQuery,
  section = "home",
  onVideoClick,
}: VideoGridProps) {
  const [videos, setVideos] = useState<MockVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Mock video data generator
  const generateMockVideos = (
    count: number,
    isRebelContent = false,
    sectionId = section
  ): MockVideo[] => {
    const mockVideos: MockVideo[] = [];
    const baseTimestamp = Date.now();
    const rebelTitles = [
      "The TRUTH About Corporate Censorship They Don't Want You to Know",
      "BANNED EVERYWHERE: Why Big Tech Fears This Message",
      "Corporate Media EXPOSED: The Real Agenda",
      "Fighting Back Against Digital Tyranny",
      "Underground Truth: What Really Happened",
      "REBEL EXCLUSIVE: Inside the Censorship Machine",
      "Why This Video is BANNED on Other Platforms",
      "The Corporate Conspiracy Against Free Speech",
    ];

    const normalTitles = [
      "Amazing DIY Project That Will Blow Your Mind",
      "10 Life Hacks That Actually Work",
      "Incredible Nature Documentary: Wildlife in 4K",
      "Learning Guitar: Complete Beginner's Guide",
      "Cooking the Perfect Pasta: Italian Secrets",
      "Travel Vlog: Hidden Gems in Tokyo",
      "Tech Review: Is This Worth Your Money?",
      "Fitness Journey: 30 Days of Change",
    ];

    const creators = [
      { name: "TruthSeeker", isVerified: true },
      { name: "RebelCreator", isVerified: false },
      { name: "FreedomFighter", isVerified: true },
      { name: "DigitalNomad", isVerified: false },
      { name: "TechReviewer", isVerified: true },
      { name: "CreativeGuru", isVerified: false },
      { name: "AdventureBlogger", isVerified: true },
      { name: "LifestyleTips", isVerified: false },
    ];

    const tags = isRebelContent
      ? [
          ["banned", "truth", "censorship"],
          ["corporate", "media", "exposed"],
          ["freedom", "speech", "rebel"],
        ]
      : [
          ["diy", "creative", "tutorial"],
          ["tech", "review", "gadgets"],
          ["travel", "adventure", "vlog"],
        ];

    for (let i = 0; i < count; i++) {
      const creator = creators[Math.floor(Math.random() * creators.length)];
      const titleArray = isRebelContent ? rebelTitles : normalTitles;
      const tagArray = tags[Math.floor(Math.random() * tags.length)];
      const uniqueId = `${sectionId}-${
        isRebelContent ? "rebel" : "normal"
      }-${baseTimestamp}-${i}-${Math.random().toString(36).substr(2, 9)}`;

      mockVideos.push({
        id: uniqueId,
        title: titleArray[Math.floor(Math.random() * titleArray.length)],
        thumbnail: `https://picsum.photos/320/180?random=${uniqueId}`,
        creator: {
          name: creator.name,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${creator.name}`,
          isVerified: creator.isVerified,
        },
        views: `${Math.floor(Math.random() * 999)}K`,
        uploadTime: `${Math.floor(Math.random() * 7) + 1} days ago`,
        duration: `${Math.floor(Math.random() * 20) + 1}:${Math.floor(
          Math.random() * 60
        )
          .toString()
          .padStart(2, "0")}`,
        isRebelContent: isRebelContent,
        isBannedElsewhere: isRebelContent && Math.random() > 0.5,
        likes: Math.floor(Math.random() * 10000),
        comments: Math.floor(Math.random() * 500),
        tags: tagArray,
      });
    }

    return mockVideos;
  };

  // Load videos based on section
  useEffect(() => {
    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      let newVideos: MockVideo[] = [];

      switch (section) {
        case "rebel-trending":
        case "banned-elsewhere":
        case "underground":
        case "anti-corporate":
          newVideos = generateMockVideos(12, true, section);
          break;
        case "trending":
          newVideos = [
            ...generateMockVideos(4, true, section),
            ...generateMockVideos(8, false, section),
          ];
          break;
        default:
          newVideos = [
            ...generateMockVideos(3, true, section),
            ...generateMockVideos(15, false, section),
          ];
      }

      // Filter by search query if provided
      if (searchQuery) {
        newVideos = newVideos.filter(
          (video) =>
            video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            video.creator.name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            video.tags?.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
      }

      setVideos(newVideos);
      setIsLoading(false);
    }, 1000);
  }, [section, searchQuery]);

  const loadMoreVideos = () => {
    setLoadingMore(true);

    setTimeout(() => {
      const isRebelSection = [
        "rebel-trending",
        "banned-elsewhere",
        "underground",
        "anti-corporate",
      ].includes(section);
      const moreVideos = generateMockVideos(
        8,
        isRebelSection,
        `${section}-more`
      );
      setVideos((prev) => [...prev, ...moreVideos]);
      setLoadingMore(false);
    }, 1000);
  };

  const getSectionHeader = () => {
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
      trending: {
        title: "Trending",
        subtitle: "What's hot on Origin right now",
      },
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
    };

    return sectionConfig[section] || sectionConfig["home"];
  };

  const sectionHeader = getSectionHeader();
  const Icon = sectionHeader.icon;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <div className="flex items-center gap-3 mb-2">
          {Icon && (
            <Icon
              className={`h-6 w-6 ${
                sectionHeader.isRebel ? "text-destructive" : ""
              }`}
            />
          )}
          <h1
            className={`text-2xl font-bold ${
              sectionHeader.isRebel ? "text-destructive" : ""
            }`}
          >
            {sectionHeader.title}
          </h1>
          {sectionHeader.isRebel && (
            <Badge variant="destructive" className="rebel-glow">
              REBEL ZONE
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">{sectionHeader.subtitle}</p>
      </div>

      {/* Search Results Info */}
      {searchQuery && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <p>
            Showing results for: <strong>"{searchQuery}"</strong>
            {videos.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                ({videos.length} videos found)
              </span>
            )}
          </p>
        </div>
      )}

      {/* No Results */}
      {videos.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No videos found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? `No results for "${searchQuery}". Try different keywords.`
              : "No videos available in this section yet."}
          </p>
        </div>
      )}

      {/* Video Grid */}
      {videos.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                {...video}
                onClick={() => onVideoClick?.(video.id)}
                onCreatorClick={() =>
                  console.log("Navigate to creator:", video.creator.name)
                }
                onAddToPlaylist={() =>
                  console.log("Add to playlist:", video.id)
                }
                onShare={() => console.log("Share video:", video.id)}
              />
            ))}
          </div>

          {/* Load More Button */}
          <div className="text-center">
            <Button
              onClick={loadMoreVideos}
              disabled={loadingMore}
              variant="outline"
              size="lg"
            >
              {loadingMore ? "Loading more videos..." : "Load More Videos"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
