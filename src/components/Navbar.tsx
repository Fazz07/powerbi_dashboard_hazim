// src/components/Navbar.tsx
import { useState, useEffect } from 'react';
import { Bell, LogOut, Moon, Sun, BellRing } from 'lucide-react'; // Settings icon removed from imports
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
import { notificationStore } from '@/stores/notificationStore';

interface NavbarProps {
  onToggleEditMode: () => void;
  isEditMode: boolean;
  onToggleNotificationPanel: () => void;
}

const Navbar = ({ onToggleEditMode, isEditMode, onToggleNotificationPanel }: NavbarProps) => {
  const { theme, setTheme } = useTheme();
  const [unreadNotifications, setUnreadNotifications] = useState(notificationStore.getUnreadCount());
  const [userInitial, setUserInitial] = useState('U' ); // State to hold the user's initial
  const [userName, setUserName] = useState('U' );

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      setUnreadNotifications(notificationStore.getUnreadCount());
    });
    return unsubscribe;
  }, []);

  // Effect to get the user's initial from localStorage
  useEffect(() => {
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);

        let name = '';

        if (user && user.email && typeof user.email === 'string' && user.email.length > 0) {
          const nameFromEmail = user.email.split('@')[0];
          if (nameFromEmail.length > 0) {
            name = nameFromEmail;
            setUserInitial(name.charAt(0).toUpperCase());
            setUserName(name); // Save full name from email
            return;
          }
        }

        if (user && user.name && typeof user.name === 'string' && user.name.length > 0) {
          name = user.name;
          setUserInitial(name.charAt(0).toUpperCase());
          setUserName(name); // Save full name from user.name
          return;
        }
      }
    } catch (e) {
      console.error("Failed to parse user data from localStorage for initial:", e);
      setUserInitial('U'); // Fallback if parsing fails
      setUserName('User'); // Fallback name
    }
  }, []);


  const handleNotificationClick = () => {
    onToggleNotificationPanel();
    // Optionally, mark notifications as read when panel is opened, or have a button inside
    // notificationStore.markAllAsRead(); // Example: if opening panel marks all as read
  };

  return (
    <header className="bg-gray-300 dark:bg-gray-900 sticky top-0 z-50 w-full bg-card border-b border-border shadow-md transition-colors duration-300">
      <div className="container flex h-16 max-w-full items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          {/* Enhanced Hello User Greeting */}
          <div className="relative">
            <div className="bg-gradient-to-r from-primary to-purple-500 rounded-xl p-3 pl-5 pr-8 text-primary-foreground shadow-lg transition-all duration-300 hover:scale-[1.01]">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                Hello, {userName}
              </h1>
              <p className="text-xs opacity-90 font-medium">Welcome back to your dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleEditMode}
            className={`transition-all font-semibold text-white rounded-md px-4 py-2 ${
              isEditMode
                ? "bg-[#39496a] hover:bg-[#273651] shadow-md"
                : "bg-[#39496a] border border-gray-300 hover:bg-[#273651] hover:text-white dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
            }`}
          >
            {isEditMode ? "Save Layout" : "Edit Mode"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative text-foreground  hover:bg-gray-400 hover:text-accent-foreground rounded-full"
            onClick={handleNotificationClick}
          >
            {unreadNotifications > 0 ? <BellRing className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gray-500 text-xs text-white flex items-center justify-center font-bold">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Button>

          {/* User Avatar Dropdown - incorporating old settings menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0 focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-r from-primary to-purple-400 flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-md">
                  {userInitial} {/* Display the dynamic initial here */}
                </div>
                <span className="sr-only">Open user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
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
              <DropdownMenuItem onClick={() => window.location.href = '/login'}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;