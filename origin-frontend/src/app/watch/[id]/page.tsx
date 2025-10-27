"use client";

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Demo video data
const videos = [
  {
    id: '1',
    title: "Big Buck Bunny",
    description: "A large and lovable rabbit deals with three tiny rodents.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    views: "2.5M views",
    likes: 25430,
    dislikes: 123,
    uploadDate: "Jan 15, 2024",
    creator: {
      name: "Blender Foundation",
      subscribers: "1.2M subscribers",
      isVerified: true
    },
    isRebelContent: false,
    tags: ["animation", "short film", "open source"]
  },
  {
    id: '2',
    title: "Elephant Dream",
    description: "Two characters find a mysterious elephant.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    views: "1.8M views",
    likes: 18320,
    dislikes: 89,
    uploadDate: "Feb 10, 2024",
    creator: {
      name: "Blender Institute",
      subscribers: "850K subscribers",
      isVerified: true
    },
    isRebelContent: false,
    tags: ["animation", "fantasy", "blender"]
  },
  {
    id: '3',
    title: "Sintel",
    description: "A young woman becomes a warrior to find her dragon.",
    thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    views: "3.4M views",
    likes: 34210,
    dislikes: 156,
    uploadDate: "Mar 5, 2024",
    creator: {
      name: "Blender Foundation",
      subscribers: "1.2M subscribers",
      isVerified: true
    },
    isRebelContent: false,
    tags: ["animation", "adventure", "dragon"]
  }
];

interface VideoPageProps {
  params: { id: string };
}

export default function VideoPage({ params }: VideoPageProps) {
  const [video, setVideo] = useState(videos.find(v => v.id === params.id));
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [showStatus, setShowStatus] = useState(true);

  useEffect(() => {
    // Check backend connection
    const checkBackendConnection = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
                       process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
                       "https://originvideo.duckdns.org";
        
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok) {
          setBackendStatus('connected');
          // Hide status message after 3 seconds if connected
          setTimeout(() => setShowStatus(false), 3000);
        } else {
          setBackendStatus('disconnected');
        }
      } catch (error) {
        console.log('Backend not available, using demo videos');
        setBackendStatus('disconnected');
      }
    };

    checkBackendConnection();
  }, []);

  // Use demo video if backend is down and video not found
  const displayVideo = video || videos[0]; // fallback to first video

  if (!displayVideo) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Backend Status Notification */}
      {showStatus && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          backendStatus === 'connected' ? 'bg-green-500 text-white' :
          backendStatus === 'disconnected' ? 'bg-orange-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {backendStatus === 'connected' && (
              <>
                <span className="text-xl">✅</span>
                <span>Backend Connected</span>
                <span className="text-sm opacity-75">(Using live data from originvideo.duckdns.org)</span>
              </>
            )}
            {backendStatus === 'disconnected' && (
              <>
                <span className="text-xl">🎬</span>
                <span>Offline Mode</span>
                <span className="text-sm opacity-75">(Using demo videos)</span>
              </>
            )}
            {backendStatus === 'checking' && (
              <>
                <span className="text-xl animate-spin">⟳</span>
                <span>Checking connection...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Simple Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-[#e11d48]">
            🎬 Origin
          </Link>
          {backendStatus === 'connected' && (
            <span className="ml-4 text-sm text-green-600 font-medium">
              Live Data Connected
            </span>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player Section */}
            <div className="lg:col-span-2">
              {/* Video Player */}
              <div className="bg-black rounded-lg overflow-hidden aspect-video mb-4">
                <video
                  src={displayVideo.videoUrl}
                  controls
                  className="w-full h-full"
                  autoPlay
                />
              </div>

              {/* Video Info */}
              <div className="mb-4">
                <h1 className="text-xl font-bold mb-2">{displayVideo.title}</h1>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{displayVideo.views} views • {displayVideo.uploadDate}</span>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-50">
                      <span>👍</span> {displayVideo.likes.toLocaleString()}
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-50">
                      <span>👎</span> {displayVideo.dislikes}
                    </button>
                  </div>
                </div>
              </div>

              {/* Creator Info */}
              <div className="flex items-center justify-between p-3 border rounded-lg mb-4 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold">
                      {video.creator.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{displayVideo.creator.name}</span>
                      {displayVideo.creator.isVerified && <span className="text-blue-500">✓</span>}
                    </div>
                    <span className="text-sm text-gray-600">{displayVideo.creator.subscribers}</span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-[#e11d48] text-white rounded-full hover:bg-[#be123c] transition-colors">
                  Subscribe
                </button>
              </div>

              {/* Description */}
              {displayVideo.description && (
                <div className="p-3 bg-white rounded-lg mb-4 border">
                  <p className="text-gray-700 whitespace-pre-wrap">{displayVideo.description}</p>
                </div>
              )}

              {/* Tags */}
              {displayVideo.tags && displayVideo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {displayVideo.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Rebel Content Badge */}
              {displayVideo.isRebelContent && (
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
                <h3 className="font-medium mb-4 bg-white p-3 rounded-lg border">Related Videos</h3>
                <div className="space-y-3">
                  {videos.filter(v => v.id !== displayVideo.id).map((relatedVideo) => (
                    <Link
                      key={relatedVideo.id}
                      href={`/watch/${relatedVideo.id}`}
                      className="flex gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors block bg-white border rounded"
                    >
                      {/* Thumbnail */}
                      <div className="w-40 h-24 flex-shrink-0">
                        <div className="relative w-full h-full rounded overflow-hidden">
                          <img
                            src={relatedVideo.thumbnail}
                            alt={relatedVideo.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1 leading-tight">
                          {relatedVideo.title}
                        </h4>
                        
                        {/* Channel */}
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <span>{relatedVideo.creator.name}</span>
                          {relatedVideo.creator.isVerified && (
                            <span className="text-blue-500">✓</span>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{relatedVideo.views}</span>
                          <span>•</span>
                          <span>{relatedVideo.uploadDate}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
