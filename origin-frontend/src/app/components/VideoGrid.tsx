"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoCard } from "./VideoCard";
import { useVideo } from "../hooks/useVideos";
import { Skeleton } from "./ui/skeleton";

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

  // fetch from Next API (which proxies to Nest)
  const { videos, isLoading, isError, refresh } = useVideo({
    cat: active === "all" ? undefined : active,
    page: 1,
  });

  // If your backend fields differ, adapt here:
  const normalized = useMemo(
    () =>
      (videos || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        creator: v.creator ?? v.channelName,
        thumbnail: v.thumbnail ?? v.thumbUrl,
        duration: v.duration ?? v.durationText ?? "0:00",
        views: v.viewsText ?? v.views ?? "0",
        uploadTime: v.publishedAtText ?? v.uploadTime ?? "",
        isRebel: v.isRebel ?? false,
      })),
    [videos]
  );

  return (
    <main className="ml-64 p-6">
      {/* Section header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-black">Recommended</h2>
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

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-red-600">
          Failed to load videos.{" "}
          <button className="underline" onClick={() => refresh()}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {!isLoading && !isError && (
        <>
          {normalized.length === 0 ? (
            <div className="text-gray-500">
              No videos found for this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {normalized.map((video: any) => (
                <VideoCard key={video.id} {...video} />
              ))}
            </div>
          )}
        </>
      )}

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
