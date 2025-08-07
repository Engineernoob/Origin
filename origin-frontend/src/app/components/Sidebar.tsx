import {
  Home,
  Flame,
  Clock,
  PlaySquare,
  Heart,
  Music,
  Gamepad2,
  Film,
  Tv,
  Radio,
  Skull,
  Zap,
  Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export function Sidebar() {
  const mainItems = [
    { icon: Home, label: "Home", active: true },
    { icon: Flame, label: "Trending" },
    { icon: Clock, label: "History" },
    { icon: PlaySquare, label: "Your videos" },
    { icon: Heart, label: "Liked videos" },
  ];

  const categories = [
    { icon: Music, label: "Music" },
    { icon: Gamepad2, label: "Gaming" },
    { icon: Film, label: "Movies" },
    { icon: Tv, label: "Shows" },
    { icon: Radio, label: "Live" },
  ];

  const rebelliousItems = [
    { icon: Skull, label: "Underground", color: "text-red-600" },
    { icon: Zap, label: "Banned Elsewhere", color: "text-orange-600" },
    { icon: Users, label: "Resistance", color: "text-purple-600" },
  ];

  return (
    <aside className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 bg-white border-r overflow-y-auto">
      <div className="p-3 space-y-1">
        {/* Main navigation */}
        {mainItems.map((item) => (
          <Button
            key={item.label}
            variant={item.active ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 h-10 px-3"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Button>
        ))}

        <Separator className="my-3" />

        {/* Categories */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-sm text-gray-500 uppercase tracking-wide">
            Browse
          </h3>
          {categories.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className="w-full justify-start gap-3 h-10 px-3"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          ))}
        </div>

        <Separator className="my-3" />

        {/* Rebellious section */}
        <div className="space-y-1">
          <h3 className="px-3 py-2 text-sm text-red-600 uppercase tracking-wide font-medium">
            🔥 Rebel Zone
          </h3>
          {rebelliousItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className="w-full justify-start gap-3 h-10 px-3 hover:bg-red-50"
            >
              <item.icon className={`h-5 w-5 ${item.color}`} />
              <span className={item.color}>{item.label}</span>
            </Button>
          ))}
        </div>

        <Separator className="my-3" />

        {/* Footer info */}
        <div className="px-3 py-4 text-xs text-gray-500 space-y-2">
          <p>Origin - The platform that respects creators and viewers.</p>
          <p className="text-red-600 font-medium">
            ⚡ No ads. No corporate BS. Pure content.
          </p>
          <p>© 2024 Origin Platform</p>
        </div>
      </div>
    </aside>
  );
}
