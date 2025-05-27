
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Settings } from 'lucide-react';
import { DashboardPage } from '@/types/page';
import { useToast } from '@/hooks/use-toast';

interface PageTabsProps {
  pages: DashboardPage[];
  currentPageId: string;
  onPageChange: (pageId: string) => void;
  onAddPage: (name: string) => void;
  onDeletePage: (pageId: string) => void;
  isEditMode: boolean;
}

const PageTabs = ({ 
  pages, 
  currentPageId, 
  onPageChange, 
  onAddPage, 
  onDeletePage,
  isEditMode
}: PageTabsProps) => {
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

  const handleDeletePage = (pageId: string, pageName: string) => {
    onDeletePage(pageId);
    toast({
      title: "Page deleted",
      description: `${pageName} has been removed`,
    });
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between p-4">
        <Tabs value={currentPageId} onValueChange={onPageChange} className="flex-1">
          <TabsList className="grid w-full grid-cols-auto">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center">
                <TabsTrigger 
                  value={page.id} 
                  className="relative group"
                >
                  {page.name}
                  {isEditMode && !page.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(page.id, page.name);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </TabsTrigger>
              </div>
            ))}
          </TabsList>
        </Tabs>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="ml-4">
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
      </div>
    </div>
  );
};

export default PageTabs;
