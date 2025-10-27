"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Flame, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: { id: number; email: string; name: string; picture?: string }) => void;
  defaultMode?: "signin" | "signup";
}

const BACKEND = 
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ??
  "https://originvideo.duckdns.org";

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  defaultMode = "signin",
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [joinRebellion, setJoinRebellion] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // TEMP mock submit (kept)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockUser = {
      id: "1",
      name: username || email.split("@")[0],
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      isCreator: joinRebellion,
      isVerified: false,
    };

    onAuthSuccess?.(mockUser);
    setIsLoading(false);
    onClose();

    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setAgreeToTerms(false);
    setJoinRebellion(false);
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
  };

  const handleGoogle = () => {
    // Kick off OAuth on the backend
    const backendUrl = 
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ??
      process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ??
      "https://originvideo.duckdns.org";
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Smaller, tighter modal */}
      <DialogContent className="sm:max-w-sm max-w-[380px] p-4 sm:p-5 rounded-xl">
        <DialogHeader className="text-center space-y-1">
          <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-md origin-gradient rebel-glow">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <DialogTitle className="text-lg">
            {mode === "signin" ? "Welcome back, Rebel" : "Join the Rebellion"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === "signin"
              ? "Sign in to your ad-free video experience"
              : "Create your account and fight against corporate control"}
          </DialogDescription>
        </DialogHeader>

        {/* OAuth first */}
        <div className="space-y-2">
          <Button
            type="button"
            onClick={handleGoogle}
            className="h-9 w-full justify-center gap-2 rounded-lg bg-[#e11d48] text-white shadow-[0_8px_20px_-6px_rgba(225,29,72,0.5)] hover:bg-[#be123c]"
          >
            {/* Simple Google “G” mark (inline SVG) */}
            <svg
              aria-hidden="true"
              focusable="false"
              width="16"
              height="16"
              viewBox="0 0 18 18"
            >
              <path
                fill="#fff"
                d="M17.64 9.2c0-.63-.06-1.25-.18-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62z"
              />
              <path
                fill="#fff"
                fillOpacity=".7"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.35-1.58-5.06-3.7H.94v2.32A9 9 0 0 0 9 18z"
              />
              <path
                fill="#fff"
                fillOpacity=".7"
                d="M3.94 10.72A5.4 5.4 0 0 1 3.64 9c0-.6.1-1.18.3-1.72V4.96H.94A9 9 0 0 0 0 9c0 1.45.35 2.82.94 4.04l2.99-2.32z"
              />
              <path
                fill="#fff"
                fillOpacity=".7"
                d="M9 3.56c1.32 0 2.5.46 3.42 1.36l2.56-2.56A9 9 0 0 0 9 0 9 9 0 0 0 .94 4.96l3 2.32C4.65 5.16 6.65 3.56 9 3.56z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-2 py-2">
            <Separator className="flex-1" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs">
                Username
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose your rebel name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-9 pl-10"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 pl-10"
                  required
                />
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(c) => setAgreeToTerms(c as boolean)}
                />
                <Label htmlFor="terms" className="text-xs leading-5">
                  I agree to the{" "}
                  <button type="button" className="text-destructive underline">
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button type="button" className="text-destructive underline">
                    Privacy Policy
                  </button>
                </Label>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                <Checkbox
                  id="rebellion"
                  checked={joinRebellion}
                  onCheckedChange={(c) => setJoinRebellion(c as boolean)}
                />
                <Label
                  htmlFor="rebellion"
                  className="flex items-center gap-2 text-xs"
                >
                  <span>Join as a Creator and fight the system</span>
                  <Badge
                    variant="destructive"
                    className="px-1.5 py-0 text-[10px]"
                  >
                    REBEL
                  </Badge>
                </Label>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="h-9 w-full origin-gradient text-sm"
            disabled={isLoading || (mode === "signup" && !agreeToTerms)}
          >
            {isLoading
              ? "Loading..."
              : mode === "signin"
              ? "Sign In"
              : "Join the Rebellion"}
          </Button>

          <Separator />

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {mode === "signin"
                ? "Don't have an account?"
                : "Already have an account?"}
            </p>
            <Button
              variant="link"
              onClick={toggleMode}
              className="h-auto p-0 text-sm"
            >
              {mode === "signin" ? "Join the Rebellion" : "Sign In"}
            </Button>
          </div>
        </form>

        {mode === "signup" && (
          <div className="mt-3 rounded-lg bg-muted/60 p-3">
            <h4 className="mb-1.5 flex items-center gap-2 text-sm font-medium">
              <Flame className="h-4 w-4 text-destructive" />
              Why Origin?
            </h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• 100% ad-free experience</li>
              <li>• Creator-first revenue sharing</li>
              <li>• No corporate censorship</li>
              <li>• Community-driven moderation</li>
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
