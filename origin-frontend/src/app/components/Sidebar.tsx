"use client";

import { useState, useEffect, useRef } from "react";
import {
  Home,
  TrendingUp,
  Users,
  Clock,
  ThumbsUp,
  PlaySquare,
  Flame,
  Shield,
  Zap,
  Music,
  Gamepad,
  BookOpen,
  Wrench,
  Palette,
  ChevronDown,
  ChevronRight,
  Settings,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";

interface SidebarProps {
  isOpen: boolean;
  isAuthenticated?: boolean;
  onNavigate?: (section: string) => void;
  currentSection?: string;
  onClose?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  isRebel?: boolean;
  count?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
  isCollapsible?: boolean;
}

export function Sidebar({
  isOpen,
  isAuthenticated = false,
  onNavigate,
  currentSection = "home",
  onClose,
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    rebelZone: true,
    categories: false,
    library: isAuthenticated,
  });
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle click outside to close sidebar on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobile &&
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && isMobile) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isMobile, onClose]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobile, isOpen]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const mainNavigation: NavSection[] = [
    {
      items: [
        { id: "home", label: "Home", icon: Home },
        { id: "trending", label: "Trending", icon: TrendingUp, badge: "HOT" },
        {
          id: "subscriptions",
          label: "Subscriptions",
          icon: Users,
          count: isAuthenticated ? 12 : undefined,
        },
      ],
    },
  ];

  const librarySection: NavSection[] = isAuthenticated
    ? [
        {
          title: "Library",
          isCollapsible: true,
          items: [
            { id: "history", label: "History", icon: Clock },
            { id: "liked", label: "Liked videos", icon: ThumbsUp },
            { id: "playlists", label: "Playlists", icon: PlaySquare, count: 8 },
            { id: "watchlater", label: "Watch later", icon: Clock, count: 23 },
          ],
        },
      ]
    : [];

  const rebelZoneSection: NavSection[] = [
    {
      title: "Rebel Zone",
      isCollapsible: true,
      items: [
        {
          id: "rebel-trending",
          label: "Rebel Trending",
          icon: Flame,
          isRebel: true,
          badge: "NEW",
        },
        {
          id: "banned-elsewhere",
          label: "Banned Elsewhere",
          icon: Shield,
          isRebel: true,
        },
        { id: "underground", label: "Underground", icon: Zap, isRebel: true },
        {
          id: "anti-corporate",
          label: "Anti-Corporate",
          icon: Wrench,
          isRebel: true,
        },
      ],
    },
  ];

  const categoriesSection: NavSection[] = [
    {
      title: "Categories",
      isCollapsible: true,
      items: [
        { id: "music", label: "Music", icon: Music },
        { id: "gaming", label: "Gaming", icon: Gamepad },
        { id: "education", label: "Education", icon: BookOpen },
        { id: "tech", label: "Technology", icon: Wrench },
        { id: "art", label: "Art & Design", icon: Palette },
      ],
    },
  ];

  const allSections = [
    ...mainNavigation,
    ...librarySection,
    ...rebelZoneSection,
    ...categoriesSection,
  ];

  const handleItemClick = (itemId: string) => {
    onNavigate?.(itemId);
    // Close sidebar on mobile after navigation
    if (isMobile) {
      onClose?.();
    }
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = currentSection === item.id;
    const Icon = item.icon;

    return (
      <Button
        key={item.id}
        variant={isActive ? "secondary" : "ghost"}
        className={`w-full justify-start h-10 px-3 transition-all duration-200 ${
          isActive ? "bg-secondary shadow-sm" : ""
        } ${
          item.isRebel
            ? "hover:bg-destructive/10 hover:shadow-md"
            : "hover:shadow-sm"
        }`}
        onClick={() => handleItemClick(item.id)}
        aria-current={isActive ? "page" : undefined}
        title={item.label}
      >
        <Icon
          className={`h-5 w-5 mr-3 transition-colors ${
            item.isRebel ? "text-destructive" : ""
          }`}
        />
        <span
          className={`flex-1 text-left transition-colors ${
            item.isRebel ? "text-destructive font-medium" : ""
          }`}
        >
          {item.label}
        </span>

        {item.badge && (
          <Badge
            variant={item.isRebel ? "destructive" : "secondary"}
            className="ml-2 text-xs px-1 py-0 transition-all"
          >
            {item.badge}
          </Badge>
        )}

        {item.count && (
          <span className="ml-2 text-xs text-muted-foreground transition-colors">
            {item.count}
          </span>
        )}
      </Button>
    );
  };

  const renderSection = (section: NavSection, sectionId: string) => {
    const isExpanded = expandedSections[sectionId];

    return (
      <div key={sectionId} className="mb-4">
        {section.title && (
          <div className="px-3 mb-2">
            {section.isCollapsible ? (
              <Button
                variant="ghost"
                className="w-full justify-start h-8 px-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection(sectionId)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                {section.title.toUpperCase()}
              </Button>
            ) : (
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
            )}
          </div>
        )}

        {(!section.isCollapsible || isExpanded) && (
          <div className="space-y-1">{section.items.map(renderNavItem)}</div>
        )}

        {section.title && <Separator className="mt-4" />}
      </div>
    );
  };

  // Don't render anything if not open on mobile
  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          ${isMobile ? "fixed" : "sticky"} 
          ${isMobile ? "top-0" : "top-16"} 
          ${isMobile ? "z-50" : "z-10"}
          w-64 bg-sidebar/95 backdrop-blur-sm border-r border-sidebar-border 
          ${isMobile ? "h-screen" : "h-[calc(100vh-4rem)]"}
          transition-all duration-300 ease-in-out
          ${
            isOpen
              ? "translate-x-0 opacity-100"
              : isMobile
              ? "-translate-x-full opacity-0"
              : "translate-x-0 opacity-100"
          }
          ${!isOpen && !isMobile ? "hidden" : ""}
          ${isMobile ? "shadow-2xl" : "shadow-sm"}
        `}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={!isOpen}
      >
        {/* Mobile header with close button */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 origin-gradient rounded-lg flex items-center justify-center rebel-glow">
                <span className="text-white font-bold text-sm">O</span>
              </div>
              <span className="font-bold text-lg">Origin</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ScrollArea
          className={`${isMobile ? "h-[calc(100vh-4rem)]" : "h-full"}`}
        >
          <nav className="p-4">
            {/* Main Navigation */}
            {renderSection(mainNavigation[0], "main")}

            {/* Library Section */}
            {isAuthenticated && renderSection(librarySection[0], "library")}

            {/* Rebel Zone Section */}
            {renderSection(rebelZoneSection[0], "rebelZone")}

            {/* Categories Section */}
            {renderSection(categoriesSection[0], "categories")}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start h-10 px-3"
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </Button>

              <div className="mt-4 px-3">
                <p className="text-xs text-muted-foreground">
                  © 2025 Origin Platform
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ad-free • Creator-focused • Rebellion-powered
                </p>
              </div>
            </div>
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
