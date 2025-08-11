"use client";

import { useRef, useState } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { VideoGrid } from "./components/VideoGrid";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen bg-white">
      <Header
        onMenuClick={() => setSidebarOpen((v) => !v)}
        menuBtnRef={menuBtnRef}
      />
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentSection="home"
        isAuthenticated={false}
        openerRef={menuBtnRef}
      />
      <VideoGrid />
    </div>
  );
}
