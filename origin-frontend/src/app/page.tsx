"use client";
import { useEffect, useRef, useState } from "react";
import { Header } from "../app/components/Header";
import { Sidebar } from "../app/components/Sidebar";
import { VideoGrid } from "../app/components/VideoGrid";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null!); // Non-null assertion to resolve type conflict

  return (
    <div className="min-h-dvh bg-white">
      <Header onMenuClick={() => setSidebarOpen(v => !v)} menuBtnRef={menuBtnRef} />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSection="home"
        isAuthenticated={false}
        openerRef={menuBtnRef} // ✅ same exact type
      />
      <main className="px-4 pb-10 pt-4 md:ml-64">
        <div className="mx-auto w-full max-w-[1280px]">
          <VideoGrid />
        </div>
      </main>
    </div>
  );
}
