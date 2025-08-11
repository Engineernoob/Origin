"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  /** Pass the element that opened the sidebar so focus can be restored on close (header menu button). */
  openerRef?: React.RefObject<HTMLButtonElement | null>;
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return isMobile;
}

export function Sidebar({
  isOpen,
  isAuthenticated = false,
  onNavigate,
  currentSection = "home",
  onClose,
  openerRef,
}: SidebarProps) {
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  // Persist expanded sections
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    rebelZone: true,
    categories: false,
    library: isAuthenticated,
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem("origin:sidebar:expanded");
      if (saved) setExpandedSections(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "origin:sidebar:expanded",
        JSON.stringify(expandedSections)
      );
    } catch {}
  }, [expandedSections]);

  const toggleSection = (sectionId: string) =>
    setExpandedSections((p) => ({ ...p, [sectionId]: !p[sectionId] }));

  // Freeze body scroll on mobile when open
  useEffect(() => {
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = isOpen ? "hidden" : prev || "unset";
    return () => {
      document.body.style.overflow = prev || "unset";
    };
  }, [isMobile, isOpen]);

  // Close on click outside (mobile only)
  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!sidebarRef.current) return;
      if (!sidebarRef.current.contains(e.target as Node)) onClose?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMobile, isOpen, onClose]);

  // ESC to close (mobile)
  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobile, isOpen, onClose]);

  // Focus trap + restore focus to opener on close
  useEffect(() => {
    if (!isMobile) return;
    if (isOpen) {
      // remember last focused to restore later if openerRef not provided
      lastFocusRef.current = (document.activeElement as HTMLElement) ?? null;
      // focus first focusable inside
      setTimeout(() => firstFocusableRef.current?.focus(), 0);
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab" || !sidebarRef.current) return;
        const focusables = sidebarRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", handleTab);
      return () => document.removeEventListener("keydown", handleTab);
    } else {
      // restore focus
      (openerRef?.current ?? lastFocusRef.current)?.focus?.();
    }
  }, [isMobile, isOpen, openerRef]);

  // Swipe-to-close (mobile)
  useEffect(() => {
    if (!isMobile || !isOpen || !sidebarRef.current) return;
    const el = sidebarRef.current;
    let startX = 0;
    let dx = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      dx = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      dx = e.touches[0].clientX - startX;
      // ignore right-to-left swipe; we only care if user swipes left on the drawer
      if (dx < 0) {
        el.style.transform = `translateX(${dx}px)`;
        el.style.opacity = `${Math.max(0.3, 1 + dx / 300)}`;
      }
    };
    const onTouchEnd = () => {
      if (dx < -80) onClose?.();
      el.style.transform = "";
      el.style.opacity = "";
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, isOpen, onClose]);

  const mainNavigation: NavSection[] = useMemo(
    () => [
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
    ],
    [isAuthenticated]
  );

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

  const handleItemClick = (itemId: string) => {
    onNavigate?.(itemId);
    if (isMobile) onClose?.();
  };

  // roving tabindex for keyboard ↑/↓ inside the nav list
  const listRef = useRef<HTMLDivElement>(null);
  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (!listRef.current) return;
    const focusables = listRef.current.querySelectorAll<HTMLButtonElement>(
      "button[role='menuitem']"
    );
    if (focusables.length === 0) return;

    const idx = Array.from(focusables).findIndex(
      (el) => el === document.activeElement
    );
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next =
        focusables[(idx + 1 + focusables.length) % focusables.length];
      next?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev =
        focusables[(idx - 1 + focusables.length) % focusables.length];
      prev?.focus();
    }
  };

  const renderNavItem = (item: NavItem, firstFocusable = false) => {
    const isActive = currentSection === item.id;
    const Icon = item.icon;

    return (
      <Button
        key={item.id}
        ref={firstFocusable ? firstFocusableRef : undefined}
        role="menuitem"
        tabIndex={0}
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
    const headingId = `section-${sectionId}`;

    return (
      <div key={sectionId} className="mb-4">
        {section.title && (
          <div className="px-3 mb-2">
            {section.isCollapsible ? (
              <Button
                variant="ghost"
                className="w-full justify-start h-8 px-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => toggleSection(sectionId)}
                aria-expanded={isExpanded}
                aria-controls={`${headingId}-panel`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-2" />
                )}
                {section.title.toUpperCase()}
              </Button>
            ) : (
              <h3
                id={headingId}
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {section.title}
              </h3>
            )}
          </div>
        )}

        <div
          id={`${headingId}-panel`}
          hidden={section.isCollapsible ? !isExpanded : false}
          aria-labelledby={section.isCollapsible ? headingId : undefined}
        >
          <div className="space-y-1">
            {section.items.map((it, idx) =>
              renderNavItem(it, sectionId === "main" && idx === 0)
            )}
          </div>
        </div>

        {section.title && <Separator className="mt-4" />}
      </div>
    );
  };

  // Don’t render if closed on mobile (keeps DOM light)
  if (isMobile && !isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden motion-safe:transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={[
          isMobile
            ? "fixed top-0 z-50 h-screen"
            : "sticky top-16 z-10 h-[calc(100vh-4rem)]",
          "w-64 border-r bg-white",
          "motion-safe:transition-all motion-safe:duration-300",
          isMobile
            ? isOpen
              ? "translate-x-0 opacity-100"
              : "-translate-x-full opacity-0"
            : "translate-x-0 opacity-100",
          isMobile ? "shadow-2xl" : "shadow-sm",
        ].join(" ")}
        role={isMobile ? "dialog" : "navigation"}
        aria-modal={isMobile ? true : undefined}
        aria-label="Main navigation"
      >
        {/* Mobile header */}
        {isMobile && (
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="origin-gradient rebel-glow flex h-8 w-8 items-center justify-center rounded-lg">
                <span className="text-sm font-bold text-white">O</span>
              </div>
              <span className="text-lg font-bold">Origin</span>
            </div>
            <Button
              ref={firstFocusableRef}
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ScrollArea className={isMobile ? "h-[calc(100vh-3.25rem)]" : "h-full"}>
          <nav
            ref={listRef}
            onKeyDown={onListKeyDown}
            className="p-4"
            aria-label="Primary"
          >
            {/* Main */}
            {renderSection(mainNavigation[0], "main")}

            {/* Library */}
            {isAuthenticated &&
              librarySection.length > 0 &&
              renderSection(librarySection[0], "library")}

            {/* Rebel Zone */}
            {renderSection(rebelZoneSection[0], "rebelZone")}

            {/* Categories */}
            {renderSection(categoriesSection[0], "categories")}

            {/* Footer */}
            <div className="mt-8 border-t pt-4">
              <Button
                variant="ghost"
                className="h-10 w-full justify-start px-3"
                role="menuitem"
                tabIndex={0}
              >
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </Button>
              <div className="mt-4 px-3 text-xs text-muted-foreground">
                <p>© 2025 Origin Platform</p>
                <p>Ad-free • Creator-focused • Rebellion-powered</p>
              </div>
            </div>
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
