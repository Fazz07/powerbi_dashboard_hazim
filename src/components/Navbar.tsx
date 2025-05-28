
import { useState } from 'react';
import { Bell, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/use-theme';

interface NavbarProps {
  onToggleEditMode: () => void;
  isEditMode: boolean;
}

const Navbar = ({ onToggleEditMode, isEditMode }: NavbarProps) => {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(3);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="container flex h-16 max-w-full items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          {/* Fancy Hello User Greeting */}
          <div className="relative">
            <div className="bg-gradient-to-r from-orange-400 via-orange-400 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-300 rounded-full animate-pulse"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">
                Hello, User! 👋
              </h1>
              <p className="text-sm opacity-90 font-medium">Welcome back to your dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button 
            variant={isEditMode ? "default" : "outline"} 
            size="sm" 
            onClick={onToggleEditMode}
            className={`transition-all font-semibold ${isEditMode ? "bg-purple-600 text-white hover:bg-purple-700 shadow-md" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            {isEditMode ? "Save Layout" : "Edit Mode"}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-gray-600 hover:bg-gray-100 rounded-full"
            onClick={() => setNotifications(0)}
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center font-bold">
                {notifications}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-100 rounded-full">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Preferences</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/login'}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm shadow-md">
            U
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
