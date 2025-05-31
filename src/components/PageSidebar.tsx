import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, FileText, BarChart3, Calendar, Folder, Mail, CreditCard } from 'lucide-react';
import { DashboardPage } from '@/types/page';
import { useToast } from '@/hooks/use-toast';
import {
Sidebar,
SidebarContent,
SidebarGroup,
SidebarGroupContent,
SidebarGroupLabel,
SidebarMenu,
SidebarMenuButton,
SidebarMenuItem,
SidebarHeader,
SidebarFooter,
} from '@/components/ui/sidebar';

interface PageSidebarProps {
   pages: DashboardPage[];
   currentPageId: string;
   onPageChange: (pageId: string) => void;
   onAddPage: (name: string) => void;
   onDeletePage: (pageId: string) => void;
   isEditMode: boolean;
 }

 const sidebarIcons = [
   { icon: BarChart3, id: 'analytics' },
   { icon: Calendar, id: 'calendar' },
   { icon: Folder, id: 'folder' },
   { icon: Mail, id: 'mail' },
   { icon: CreditCard, id: 'billing' },
 ];

 const PageSidebar = ({ 
   pages, 
   currentPageId, 
   onPageChange, 
   onAddPage, 
   onDeletePage,
   isEditMode
 }: PageSidebarProps) => {
   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
   const [newPageName, setNewPageName] = useState('');
   const { toast } = useToast();

   const handleAddPage = () => {
     if (newPageName.trim()) {
       onAddPage(newPageName.trim());
       setNewPageName('');
       setIsAddDialogOpen(false);
       toast({
         title: "Page added",
         description: `${newPageName} has been created`, variant: "destructive"
       });
     }
   };

   const handleDeletePage = (pageId: string, pageName: string, e: React.MouseEvent) => {
     e.stopPropagation();
     onDeletePage(pageId);
     toast({
       title: "Page deleted",
       description: `${pageName} has been removed`, variant: "destructive"
     });
   };

   return (
     <Sidebar className="bg-sidebar-background border-0 shadow-xl">
       <SidebarHeader className="p-6 border-b border-sidebar-border">
         <div className="text-sidebar-foreground">
           <div className="w-10 h-10 bg-sidebar-dark-accent rounded-lg flex items-center justify-center mb-2 shadow-md">
             <span className="text-sidebar-foreground font-bold text-lg">BI</span>
            </div>
          </div>
        </SidebarHeader>


       <SidebarContent className="bg-sidebar-background">


         <SidebarGroup className="px-4 text-sidebar-foreground">
           <SidebarGroupLabel className="text-xs uppercase tracking-wide mb-3 font-semibold">
             Dashboard Pages
           </SidebarGroupLabel>
           <SidebarGroupContent>
             <SidebarMenu className="space-y-1">
               {pages.map((page) => (
                 <SidebarMenuItem key={page.id} className="group">
                   <SidebarMenuButton
                     onClick={() => onPageChange(page.id)}
                     isActive={currentPageId === page.id}
                     className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent rounded-xl h-12 transition-colors duration-200"
                   >
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-sidebar-dark-accent flex items-center justify-center shadow-sm">
                         <FileText className="h-4 w-4 text-sidebar-foreground" />
                       </div>
                       <span className="font-semi-bold text-base">{page.name}</span>
                     </div>
                     {isEditMode && !page.isDefault && (
                       <Button
                         variant="ghost"
                         size="sm"
                         className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-500 hover:text-white rounded-md"
                         onClick={(e) => handleDeletePage(page.id, page.name, e)}
                       >
                         <X className="h-3 w-3" />
                       </Button>
                     )}
                   </SidebarMenuButton>
                 </SidebarMenuItem>
               ))}
             </SidebarMenu>
           </SidebarGroupContent>
         </SidebarGroup>
       </SidebarContent>

<SidebarFooter className="p-4 bg-sidebar-background border-t border-sidebar-border">
         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
           <DialogTrigger asChild>
             <Button variant="outline" className="w-full bg-sidebar-background border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground rounded-xl shadow-sm transition-colors duration-200">
               <Plus className="h-4 w-4" />
               Add Page
             </Button>
           </DialogTrigger>
           <DialogContent className="rounded-xl"> {/* Added rounded-xl */}
             <DialogHeader>
               <DialogTitle>Add New Page</DialogTitle>
             </DialogHeader>
             <div className="space-y-4">
               <div>
                 <Label htmlFor="page-name">Page Name</Label>
                 <Input
                   id="page-name"
                   value={newPageName}
                   onChange={(e) => setNewPageName(e.target.value)}
                   placeholder="Enter page name..."
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       handleAddPage();
                     }
                   }}
                   className="rounded-md" // Added rounded-md
                 />
               </div>
               <div className="flex justify-end space-x-2">
                 <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-md"> {/* Added rounded-md */}
                   Cancel
                 </Button>
                 <Button onClick={handleAddPage} disabled={!newPageName.trim()} className="rounded-md"> {/* Added rounded-md */}
                   Add Page
                 </Button>
               </div>
             </div>
           </DialogContent>
         </Dialog>
       </SidebarFooter>
     </Sidebar>
   );
 };

 export default PageSidebar;