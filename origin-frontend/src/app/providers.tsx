"use client";

import * as React from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/app/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}