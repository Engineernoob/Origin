import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch");
    return r.json();
  });

// Fallback demo videos for when backend is not available
const demoVideos = [
  {
    id: 1,
    title: "Big Buck Bunny",
    description: "A large and lovable rabbit deals with three tiny rodents.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    views: 2543000,
    createdAt: "2024-01-15T00:00:00.000Z"
  },
  {
    id: 2,
    title: "Elephant Dream",
    description: "Two characters find a mysterious elephant.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    views: 1832000,
    createdAt: "2024-02-10T00:00:00.000Z"
  },
  {
    id: 3,
    title: "Sintel",
    description: "A young woman becomes a warrior to find her dragon.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    views: 3421000,
    createdAt: "2024-03-05T00:00:00.000Z"
  }
];

// Adjust keys as needed for your endpoint
type Params = Record<string, string | number | undefined | null>;

function toSearch(params: Params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v)); // <-- ensure string
  }
  return usp.toString();
}

export function useVideos(params: Params) {
  const qs = toSearch(params);
  const key = qs ? `/api/videos?${qs}` : "/api/videos";

  const { data, error, isLoading, mutate } = useSWR(
    key, 
    async (url) => {
      try {
        // Try to fetch from the API first
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error("Failed to fetch");
        return response.json();
      } catch (err) {
        // If API fails, return demo videos
        console.warn("Backend API unavailable, using demo videos:", err);
        return demoVideos;
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute cache
    }
  );

  return {
    videos: data ?? demoVideos,
    isLoading,
    isError: !!error && data === null,
    refresh: mutate,
  };
}
