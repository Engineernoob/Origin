"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export function BackBar() {
  const router = useRouter();

  return (
    <div className="sticky top-[64px] z-40 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Fallback link (always visible) */}
        <Link href="/" className="text-sm text-neutral-600 hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}