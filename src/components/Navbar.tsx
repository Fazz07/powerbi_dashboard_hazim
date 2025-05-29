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
     <header className="sticky top-0 z-50 w-full bg-card border-b border-border shadow-md transition-colors duration-300"> {/* Changed bg-gray-200 to bg-card, added shadow and transition */}
       <div className="container flex h-16 max-w-full items-center justify-between px-6">
         <div className="flex items-center space-x-6">
           {/* Enhanced Hello User Greeting */}
           <div className="relative">
             <div className="bg-gradient-to-r from-primary to-purple-500 rounded-xl p-3 pl-5 pr-8 text-primary-foreground shadow-lg transition-all duration-300 hover:scale-[1.01]"> {/* Refined gradient, padding, rounded, shadow, hover effect */}
               <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div> {/* Smaller pulse */}
               <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent"> {/* Smaller font, subtle gradient */}
                 Hello, User! 👋
               </h1>
               <p className="text-xs opacity-90 font-medium">Welcome back to your dashboard</p> {/* Smaller font */}
             </div>
           </div>
         </div>

         <div className="flex items-center space-x-4">
           <Button 
     variant={isEditMode ? "default" : "outline"} 
     size="sm" 
     onClick={onToggleEditMode}
     className={`transition-all font-semibold text-white rounded-md px-4 py-2 ${ // Rounded-md, px, py
       isEditMode 
         ? "bg-primary hover:bg-primary/90 shadow-md" // Use primary variable
         : "bg-gray-600 border border-gray-300 hover:bg-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600" // Dark mode adjustments
     }`}
   >
     {isEditMode ? "Save Layout" : "Edit Mode"}
   </Button>


           <Button 
             variant="ghost" 
             size="icon" 
             className="relative text-foreground hover:bg-accent hover:text-accent-foreground rounded-full" // Use foreground and accent for theme consistency
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
               <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent hover:text-accent-foreground rounded-full"> {/* Use foreground and accent */}
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
               <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => window.location.href = '/login'}>
                 <LogOut className="mr-2 h-4 w-4" />
                 Logout
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>

           <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-400 flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-md"> {/* Use primary variable */}
             U
           </div>
         </div>
       </div>
     </header>
   );
 };

 export default Navbar;