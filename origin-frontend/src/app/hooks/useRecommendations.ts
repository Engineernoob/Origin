import { useEffect, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ||
  'https://originvideo.duckdns.org';

interface Recommendation {
  userId: string;
  videoId: number;
  score: number;
  reason: string;
  algorithm: string;
  trainedWith: string;
  metadata?: {
    userPreferences?: string[];
    watchHistory?: number[];
    similarUsers?: string[];
    category?: string;
    trendingScore?: number;
    watchTime?: number;
    channelAffinity?: number;
    topicSimilarity?: number;
  };
}

export function useRecommendations(algorithm?: string, videoId?: string) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (algorithm) params.set('algorithm', algorithm);
        if (videoId) params.set('videoId', videoId);
        params.set('limit', '20');

        const absoluteUrl = `${API_BASE}/recommendations?${params}`;
        console.log("Fetching recommendations from:", absoluteUrl);
        const response = await fetch(absoluteUrl, {
          credentials: 'include', // Include cookies for auth
        });

        if (!response.ok) {
          // Don't show error for unauthorized, just return empty
          if (response.status === 401) {
            setLoading(false);
            return;
          }
          throw new Error(`Failed to fetch recommendations: ${response.status}`);
        }

        const data = await response.json();
        setRecommendations(data);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [algorithm, videoId]);

  return { recommendations, loading, error };
}
