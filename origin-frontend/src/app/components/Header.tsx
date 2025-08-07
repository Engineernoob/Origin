import { Search, Menu, User, Upload, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-14 items-center px-4">
        {/* Menu button and logo */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-sm shadow-lg">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <h1 className="text-xl tracking-tight">
              <span className="bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                Origin
              </span>
            </h1>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-2xl mx-auto px-4">
          <div className="relative flex">
            <Input
              placeholder="Search"
              className="rounded-l-full rounded-r-none border-r-0 bg-white focus:ring-blue-500 focus:border-blue-500 pl-4 pr-4 h-10"
            />
            <Button 
              type="submit" 
              className="rounded-r-full rounded-l-none bg-gray-50 hover:bg-gray-100 border border-l-0 border-gray-300 px-6 h-10"
              variant="ghost"
            >
              <Search className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <Upload className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};