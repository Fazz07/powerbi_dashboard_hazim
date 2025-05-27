
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
        description: `${newPageName} has been created`,
      });
    }
  };

  const handleDeletePage = (pageId: string, pageName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeletePage(pageId);
    toast({
      title: "Page deleted",
      description: `${pageName} has been removed`,
    });
  };

  return (
    <Sidebar className="bg-purple-700 border-0">
      <SidebarHeader className="p-6 border-b border-purple-600">
        <div className="text-white">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-2 shadow-md">
            <span className="text-purple-700 font-bold text-lg">CM</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-purple-700">
        {/* Quick Action Icons */}
        <div className="p-4 space-y-2">
          {sidebarIcons.map((item, index) => (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              className="w-12 h-12 rounded-xl text-white hover:bg-purple-600 transition-colors"
            >
              <item.icon className="h-6 w-6" />
            </Button>
          ))}
        </div>

        <SidebarGroup className="px-4">
          <SidebarGroupLabel className="text-white text-xs uppercase tracking-wide mb-3 font-semibold">
            Dashboard Pages
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {pages.map((page) => (
                <SidebarMenuItem key={page.id} className="group">
                  <SidebarMenuButton
                    onClick={() => onPageChange(page.id)}
                    isActive={currentPageId === page.id}
                    className="w-full justify-between text-white hover:bg-purple-600 data-[active=true]:bg-purple-600 rounded-xl h-12"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shadow-sm">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{page.name}</span>
                    </div>
                    {isEditMode && !page.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white rounded-md"
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

      <SidebarFooter className="p-4 bg-purple-700">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full bg-purple-600 border-purple-500 hover:bg-purple-700 text-white hover:text-white rounded-xl shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Page
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPage} disabled={!newPageName.trim()}>
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
