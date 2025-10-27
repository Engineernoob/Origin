"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Menu, Flame, User, Bell, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "@/app/lib/auth-context";
import { AuthModal } from "../components/auth/AuthModel";
import { toast } from "sonner";

type HeaderProps = {
  onMenuClick?: () => void;
  menuBtnRef?: React.RefObject<HTMLButtonElement | null>; // optional: hook up your sidebar toggle
};

export function Header({ onMenuClick, menuBtnRef }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [q, setQ] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [openSignIn, setOpenSignIn] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="mx-auto flex h-[64px] max-w-[1280px] items-center gap-3 px-4">
        {/* Left: menu + brand */}
        <Button
          ref={menuBtnRef}
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-md"
          aria-label="Open menu"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex select-none items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-b from-[#ef4444] to-[#b91c1c] shadow-[0_4px_16px_-4px_rgba(239,68,68,0.45)]">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold leading-none text-[20px] tracking-[-0.01em]">
            Origin
          </span>
          <span className="ml-1 rounded-md bg-neutral-900 px-2 py-[2px] text-[10px] font-semibold leading-none text-white">
            AD-FREE
          </span>
        </div>

        {/* Center: search */}
        <form
          onSubmit={onSubmit}
          className="mx-3 flex min-w-0 flex-1 items-center"
        >
          <div className="flex w-full items-center rounded-xl border border-gray-200 bg-white pl-3 pr-1 shadow-sm focus-within:border-[#e11d48] focus-within:ring-4 focus-within:ring-[#e11d48]/10">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search videos, creators, rebel content..."
              className="h-12 flex-1 border-0 bg-transparent p-0 text-[14px] placeholder:text-neutral-400 focus-visible:ring-0"
              aria-label="Search"
            />

            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="rounded-md px-3 py-1 text-[13px] text-neutral-600 hover:bg-neutral-50"
              aria-expanded={advancedOpen}
              aria-controls="advanced-search"
            >
              Advanced
            </button>

            <Button
              type="submit"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-[10px] border-l border-neutral-200 bg-white hover:bg-neutral-50"
              aria-label="Run search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Right: auth area */}
        {!user ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-lg border border-neutral-300 bg-white px-4 text-[14px] hover:bg-neutral-50"
              onClick={() => setOpenSignIn(true)}
            >
              Sign in
            </Button>
            <Button
              className="h-10 rounded-lg bg-[#e11d48] px-4 text-[14px] text-white shadow-[0_8px_20px_-6px_rgba(225,29,72,0.5)] hover:bg-[#be123c]"
              onClick={() => setOpenSignUp(true)}
            >
              Join the Rebellion
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="hidden sm:flex h-10 rounded-lg px-3"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-lg"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#e11d48]" />
            </Button>
            <div className="flex items-center gap-3">
              {user.picture && (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium hidden sm:block">{user.name}</span>
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-lg border-neutral-300 bg-white px-3 text-[14px] hover:bg-neutral-50"
              onClick={() => {
                logout();
                toast.success("Signed out");
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        )}
      </div>

      {/* Advanced dropdown */}
      {advancedOpen && (
        <div
          className="mx-auto w-full max-w-[1280px] px-4"
          id="advanced-search"
        >
          <div className="mt-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-md">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[13px] text-neutral-600">
                  Duration
                </label>
                <select className="w-full rounded-lg border border-neutral-300 p-2 text-[14px]">
                  <option>Any duration</option>
                  <option>Under 4 minutes</option>
                  <option>4–20 minutes</option>
                  <option>Over 20 minutes</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[13px] text-neutral-600">
                  Upload time
                </label>
                <select className="w-full rounded-lg border border-neutral-300 p-2 text-[14px]">
                  <option>Any time</option>
                  <option>Last hour</option>
                  <option>Last 24 hours</option>
                  <option>This week</option>
                  <option>This month</option>
                  <option>This year</option>
                </select>
              </div>
              <label className="mt-6 flex items-center gap-2 text-[14px]">
                <input type="checkbox" className="rounded" />
                <span>
                  <span className="font-medium text-[#e11d48]">REBEL</span>{" "}
                  content only
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Auth modals */}
      <AuthModal
        isOpen={openSignIn}
        onClose={() => setOpenSignIn(false)}
        defaultMode="signin"
        onAuthSuccess={() => {
          // Auth flow now handled by OAuth redirect
          toast.success("Signed in");
        }}
      />
      <AuthModal
        isOpen={openSignUp}
        onClose={() => setOpenSignUp(false)}
        defaultMode="signup"
        onAuthSuccess={() => {
          // Auth flow now handled by OAuth redirect
          toast.success("Welcome to the rebellion");
        }}
      />
    </header>
  );
}
