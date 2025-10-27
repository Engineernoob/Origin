// src/app/player/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VideoPlayer } from "@/app/components/VideoPlayer";

type PlayerData = {
  videoUrl: string;
  title: string;
  creator: {
    name: string;
    avatar?: string;
    subscribers: string;
    isVerified?: boolean;
  };
  views: string;
  likes: number;
  dislikes: number;
  uploadDate: string;
  description: string;
  isRebelContent?: boolean;
  tags?: string[];
};

function PlayerContent() {
  const params = useSearchParams();
  const id = params.get("id");
  const [data, setData] = useState<PlayerData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    (async () => {
      try {
        // Simulate API call to get video details
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (id === "1") {
          setData({
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            title: "Big Buck Bunny",
            creator: {
              name: "Blender Foundation",
              subscribers: "2.5M",
              isVerified: true,
            },
            views: "2.5M",
            likes: 45000,
            dislikes: 320,
            uploadDate: "Mar 10, 2024",
            description: "A large and lovable rabbit deals with three tiny rodents.",
            isRebelContent: false,
            tags: ["animation", "short film"],
          });
        } else {
          // fallback demo data
          setData({
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            title: "Sample Video",
            creator: {
              name: "Origin Creator",
              subscribers: "12.3k",
              isVerified: true,
            },
            views: "1,234",
            likes: 321,
            dislikes: 5,
            uploadDate: "Today",
            description: "This is demo content. Replace with data from your backend or YouTube API.",
            isRebelContent: false,
            tags: ["origin", "demo"],
          });
        }
      } catch (e) {
        setErr("Failed to load video.");
      }
    })();
  }, [id]);

  if (!id) return <div className="p-6">No video selected.</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!data) return <div className="p-6">Loading…</div>;

  return (
    <div className="px-4 py-6">
      <VideoPlayer {...data} />
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-center mt-4">Loading video...</p>
      </div>
    }>
      <PlayerContent />
    </Suspense>
  );
}
