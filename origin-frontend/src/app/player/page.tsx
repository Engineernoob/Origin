// src/app/player/page.tsx
"use client";

import { useEffect, useState } from "react";
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

export default function PlayerPage() {
  const sp = useSearchParams();
  const id = sp.get("v");
  const [data, setData] = useState<PlayerData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // TODO: replace with real backend later
        const res = await fetch(`/api/videos/${id}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setData(json as PlayerData);
        } else {
          // fallback demo data
          setData({
            videoUrl:
              "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            title: "Sample: Big Buck Bunny (demo)",
            creator: {
              name: "Origin Creator",
              subscribers: "12.3k",
              isVerified: true,
            },
            views: "1,234",
            likes: 321,
            dislikes: 5,
            uploadDate: "Today",
            description:
              "This is demo content. Replace with data from your backend or YouTube API.",
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
