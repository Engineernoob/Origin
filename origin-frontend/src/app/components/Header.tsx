"use client";

import { useState } from "react";
import { Search, User, Bell, Upload, Menu, Flame } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";

interface HeaderProps {
  onMenuClick?: () => void;
  onSearch?: (query: string) => void;
  isAuthenticated?: boolean;
  isSidebarOpen?: boolean;
  user?: {
    name: string;
    avatar?: string;
    isCreator?: boolean;
  };
}

export function Header({
  onMenuClick,
  onSearch,
  isAuthenticated = false,
  isSidebarOpen = false,
  user,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left section - Menu + Logo */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className={`transition-colors ${
              isSidebarOpen ? "bg-secondary" : ""
            }`}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="origin-gradient flex h-8 w-8 items-center justify-center rounded rebel-glow">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:block font-bold text-xl">Origin</span>
            <Badge
              variant="destructive"
              className="hidden md:inline-flex text-xs"
            >
              AD-FREE
            </Badge>
          </div>
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-2xl mx-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex">
              <Input
                type="text"
                placeholder="Search videos, creators, rebel content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-destructive"
              />
              <Button
                type="submit"
                variant="outline"
                className="rounded-l-none border-l-0 px-6 hover:bg-destructive hover:text-destructive-foreground"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Advanced search toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="absolute right-16 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Advanced
            </button>
          </form>

          {/* Advanced search options */}
          {showAdvancedSearch && (
            <div className="absolute top-full left-0 right-0 mt-1 p-4 bg-white border rounded-lg shadow-lg z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Duration</label>
                  <select className="w-full p-2 border rounded text-sm">
                    <option value="">Any duration</option>
                    <option value="short">Under 4 minutes</option>
                    <option value="medium">4-20 minutes</option>
                    <option value="long">Over 20 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Upload time</label>
                  <select className="w-full p-2 border rounded text-sm">
                    <option value="">Any time</option>
                    <option value="hour">Last hour</option>
                    <option value="day">Last 24 hours</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                    <option value="year">This year</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rebel-content"
                    className="rounded"
                  />
                  <label htmlFor="rebel-content" className="text-sm">
                    <span className="text-destructive font-medium">REBEL</span>{" "}
                    content only
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right section - User actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>

              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs"></span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Your channel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Help & feedback</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
              <Button size="sm" className="origin-gradient">
                Join the Rebellion
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
