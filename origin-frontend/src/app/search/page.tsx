"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { VideoGrid } from "../components/VideoGrid";
import { BackBar } from "../components/BackBar";

export default function SearchPage() {
  const sp = useSearchParams();
  const q = (sp.get("q") ?? "").toString();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-white">
      <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentSection="search"
          isAuthenticated={false}
        />
        <main className="flex-1 px-4 md:ml-64">
          {/* Back bar above results */}
          <div className="mx-auto w-full max-w-[1280px]">
            <BackBar />
          </div>

          {/* Results */}
          <div className="mx-auto w-full max-w-[1280px]">
            <VideoGrid searchQuery={q} section="search" />
          </div>
        </main>
      </div>
    </div>
  );
}
