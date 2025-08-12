// src/app/search/page.tsx
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { VideoGrid } from "../components/VideoGrid";

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams?.q ?? "").toString();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex">
        {/* Sidebar can stay open or be controlled by state in a fancier shell later */}
        <Sidebar isOpen />
        <main className="flex-1">
          <VideoGrid searchQuery={q} section="search" />
        </main>
      </div>
    </div>
  );
}