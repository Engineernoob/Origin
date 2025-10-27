import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoGrid } from './components/VideoGrid';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <ErrorBoundary>
        <Header />
      </ErrorBoundary>
      <div className="flex">
        <ErrorBoundary>
          <Sidebar isOpen={false} />
        </ErrorBoundary>
        <ErrorBoundary>
          <VideoGrid useRecommendations={true} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
