"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "../../components/Header";
import { Sidebar } from "../../components/Sidebar";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { RelatedVideos } from "../../components/RelatedVideos";

interface VideoDetails {
  videoUrl: string;
  title: string;
  creator: {
    name: string;
    avatar?: string;
    subscribers: string;
    isVerified: boolean;
  };
  views: string;
  likes: number;
  dislikes: number;
  uploadDate: string;
  description: string;
  isRebelContent?: boolean;
  tags?: string[];
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "https://originvideo.duckdns.org";

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;

    const fetchVideo = async () => {
      try {
        const response = await fetch(`${API_BASE}/videos/${params.id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.status}`);
        }

        const data = await response.json();
        setVideo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading video...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-white">
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Video not found</h1>
            <p className="text-gray-600 mb-6">{error || "This video doesn't exist or has been removed"}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Go back home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ErrorBoundary>
        <Header />
      </ErrorBoundary>
      <div className="flex">
        <ErrorBoundary>
          <Sidebar isOpen={false} />
        </ErrorBoundary>
        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player Section */}
            <div className="lg:col-span-2">
              {/* Video Player */}
              <div className="bg-black rounded-lg overflow-hidden aspect-video mb-4">
                <video
                  src={`${API_BASE}${video.videoUrl}`}
                  controls
                  className="w-full h-full"
                  autoPlay
                />
              </div>

              {/* Video Info */}
              <div className="mb-4">
                <h1 className="text-xl font-bold mb-2">{video.title}</h1>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{video.views} views • {video.uploadDate}</span>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-50">
                      <span>👍</span> {video.likes}
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-50">
                      <span>👎</span> {video.dislikes}
                    </button>
                  </div>
                </div>
              </div>

              {/* Creator Info */}
              <div className="flex items-center justify-between p-3 border rounded-lg mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    {video.creator.avatar ? (
                      <img
                        src={video.creator.avatar}
                        alt={video.creator.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold">
                        {video.creator.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{video.creator.name}</span>
                      {video.creator.isVerified && <span className="text-blue-500">✓</span>}
                    </div>
                    <span className="text-sm text-gray-600">{video.creator.subscribers} subscribers</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
                  Subscribe
                </button>
              </div>

              {/* Description */}
              {video.description && (
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
                </div>
              )}

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {video.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Rebel Content Badge */}
              {video.isRebelContent && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <span className="text-lg">⚠️</span>
                    <span className="font-medium">Rebel Content</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    This content may not be suitable for all audiences
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar with Related Videos */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <ErrorBoundary>
                  <RelatedVideos videoId={params.id as string} />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
