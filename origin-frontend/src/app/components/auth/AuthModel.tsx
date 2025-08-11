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
  onAuthSuccess?: (user: any) => void;
  defaultMode?: "signin" | "signup";
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock successful authentication
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

    // Reset form
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="origin-gradient flex h-10 w-10 items-center justify-center rounded-lg rebel-glow">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">Origin</span>
          </div>

          <DialogTitle className="text-xl">
            {mode === "signin" ? "Welcome back, Rebel" : "Join the Rebellion"}
          </DialogTitle>

          <DialogDescription>
            {mode === "signin"
              ? "Sign in to your ad-free video experience"
              : "Create your account and fight against corporate control"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose your rebel name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) =>
                    setAgreeToTerms(checked as boolean)
                  }
                />
                <Label htmlFor="terms" className="text-sm">
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

              <div className="flex items-center space-x-2 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <Checkbox
                  id="rebellion"
                  checked={joinRebellion}
                  onCheckedChange={(checked) =>
                    setJoinRebellion(checked as boolean)
                  }
                />
                <Label
                  htmlFor="rebellion"
                  className="text-sm flex items-center gap-2"
                >
                  <span>Join as a Creator and fight the system</span>
                  <Badge variant="destructive" className="text-xs">
                    REBEL
                  </Badge>
                </Label>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full origin-gradient"
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
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Don't have an account?"
                : "Already have an account?"}
            </p>
            <Button variant="link" onClick={toggleMode} className="p-0 h-auto">
              {mode === "signin" ? "Join the Rebellion" : "Sign In"}
            </Button>
          </div>
        </form>

        {mode === "signup" && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-destructive" />
              Why Origin?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
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
