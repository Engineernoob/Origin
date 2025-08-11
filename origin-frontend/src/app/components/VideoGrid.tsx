"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoCard } from "./VideoCard";

// Mock video data with rebellious themes mixed with regular content
const videos = [
  {
    id: "1",
    title: "The Truth They Don't Want You to See - Underground Documentary",
    creator: "RebelFilms",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=225&fit=crop",
    duration: "23:45",
    views: "1.2M",
    uploadTime: "2 days ago",
    isRebel: true,
  },
  {
    id: "2",
    title: "Nostalgic Gaming: Top 10 Games That Defined 2010-2015",
    creator: "RetroGamer",
    thumbnail:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop",
    duration: "15:30",
    views: "890K",
    uploadTime: "1 week ago",
  },
  {
    id: "3",
    title: "Raw Street Art: Voices from the Underground",
    creator: "UrbanVoices",
    thumbnail:
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=225&fit=crop",
    duration: "12:18",
    views: "567K",
    uploadTime: "3 days ago",
    isRebel: true,
  },
  {
    id: "4",
    title: "Indie Music Mix - Hidden Gems You've Never Heard",
    creator: "MusicDigger",
    thumbnail:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=225&fit=crop",
    duration: "45:22",
    views: "234K",
    uploadTime: "5 days ago",
  },
  {
    id: "5",
    title: "Corporate Media Lies Exposed - Wake Up Series Ep. 12",
    creator: "TruthSeeker",
    thumbnail:
      "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=225&fit=crop",
    duration: "28:14",
    views: "2.1M",
    uploadTime: "1 day ago",
    isRebel: true,
  },
  {
    id: "6",
    title: "DIY Electronics - Build Your Own Retro Game Console",
    creator: "TechBuilder",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=225&fit=crop",
    duration: "19:43",
    views: "456K",
    uploadTime: "4 days ago",
  },
  {
    id: "7",
    title: "Forbidden History: What Schools Never Taught You",
    creator: "HistoryRebel",
    thumbnail:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=225&fit=crop",
    duration: "32:17",
    views: "1.8M",
    uploadTime: "6 days ago",
    isRebel: true,
  },
  {
    id: "8",
    title: "Cozy Indie Game Reviews - Hidden Masterpieces",
    creator: "IndieGamerChill",
    thumbnail:
      "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=225&fit=crop",
    duration: "21:09",
    views: "123K",
    uploadTime: "1 week ago",
  },
  {
    id: "9",
    title: "Alternative Energy: Off-Grid Living Secrets",
    creator: "OffGridLife",
    thumbnail:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&h=225&fit=crop",
    duration: "16:52",
    views: "789K",
    uploadTime: "2 days ago",
  },
  {
    id: "10",
    title: "Vintage Tech Restoration - 90s Computer Revival",
    creator: "RetroTech",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=225&fit=crop",
    duration: "24:36",
    views: "345K",
    uploadTime: "3 days ago",
  },
  {
    id: "11",
    title: "Censorship Wars: The Battle for Free Speech Online",
    creator: "FreedomFighter",
    thumbnail:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=225&fit=crop",
    duration: "35:21",
    views: "3.2M",
    uploadTime: "12 hours ago",
    isRebel: true,
  },
  {
    id: "12",
    title: "Lo-Fi Hip Hop Mix - Study & Chill Vibes",
    creator: "ChillBeats",
    thumbnail:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=225&fit=crop",
    duration: "1:23:45",
    views: "678K",
    uploadTime: "5 days ago",
  },
];

const TABS = ["All", "🔥 Rebel Content", "Gaming", "Music", "Tech"] as const;

export function VideoGrid() {
  const router = useRouter();
  const sp = useSearchParams();

  const active = (sp.get("cat") ?? "All").toLowerCase();

  const setCat = (cat: string) => {
    const params = new URLSearchParams(sp.toString());
    if (cat === "All") params.delete("cat");
    else params.set("cat", cat.toLowerCase().replace(/\s+/g, ""));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    if (!active || active === "all") return videos;

    if (active === "🔥rebelcontent" || active === "rebelcontent") {
      return videos.filter((v) => v.isRebel);
    }

    // simple keyword match in title/creator
    return videos.filter((v) =>
      `${v.title} ${v.creator}`.toLowerCase().includes(active)
    );
  }, [active]);

  return (
    <main className="ml-64 p-6">
      {/* Section header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-black">Recommended</h2>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {TABS.map((t) => {
              const key = t.toLowerCase().replace(/\s+/g, "");
              const isActive = active === key;
              return (
                <button
                  key={t}
                  onClick={() => setCat(t)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors
                    ${
                      isActive
                        ? "bg-black text-white border-black"
                        : t === "🔥 Rebel Content"
                        ? "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"
                        : "bg-gray-100 text-black hover:bg-gray-200 border-gray-200"
                    }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>

      {/* Rebellious footer message */}
      <div className="mt-12 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
        <div className="text-center">
          <h3 className="text-red-800 mb-2">🔥 Join the Resistance</h3>
          <p className="text-red-700 mb-4">
            Origin is more than just a video platform - it's a movement. We
            believe in unfiltered creativity, authentic voices, and content that
            challenges the status quo.
          </p>
          <p className="text-sm text-red-600">
            No algorithms pushing corporate agendas. No censorship of
            uncomfortable truths. Just raw, real content.
          </p>
        </div>
      </div>
    </main>
  );
}
