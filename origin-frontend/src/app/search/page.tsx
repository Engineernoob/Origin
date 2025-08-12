// src/app/search/page.tsx
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { VideoGrid } from "../components/VideoGrid";
import { BackBar } from "../components/BackBar";

export default async function SearchPage({
  searchParams,
}: {
  // NOTE: in Next 15+ this is a Promise
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params?.q ?? "").toString();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex">
        <Sidebar isOpen />
        <main className="flex-1">
          <VideoGrid searchQuery={q} section="search" />
          <BackBar />
        </main>
      </div>
    </div>
  );
}
