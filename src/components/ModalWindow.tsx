// src/components/ModalWindow.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Using shadcn dialog
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// This Report interface should match what your backend/selection list provides
export interface Report {
  id: number | string; // Allow string for more flexibility
  title: string;
  description: string;
  category?: string; // Optional, if you use categories for filtering
  // Add any other relevant fields like pageName, visualName if known at this stage
  // Or rely on the DYNAMIC_PBI_CONFIG_MAP in Dashboard.tsx
}

interface ModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (reports: Report[]) => void;
}

// Mock list of reports that can be added dynamically.
// In a real app, this might come from an API.
const availableDynamicReports: Report[] = [
  { id: 1, title: 'Category Breakdown', description: 'PBI: Detailed view of sales by category.' },
  { id: 2, title: 'Revenue Trends', description: 'PBI: Analysis of revenue over time.' },
  { id: 3, title: 'Store Breakdown', description: 'PBI: Performance metrics per store.' },
  // Add more potential dynamic reports here
];

const ModalWindow: React.FC<ModalWindowProps> = ({ isOpen, onClose, onAdd }) => {
  const [selectedReportIds, setSelectedReportIds] = useState<(number | string)[]>([]);

  const handleToggleReport = (reportId: number | string) => {
    setSelectedReportIds(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleAddClick = () => {
    const reportsToAdd = availableDynamicReports.filter(report =>
      selectedReportIds.includes(report.id)
    );
    onAdd(reportsToAdd);
    setSelectedReportIds([]); // Clear selection after adding
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Power BI Visuals to Dashboard</DialogTitle>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {availableDynamicReports.map(report => (
              <div
                key={report.id}
                className="flex items-center space-x-3 p-3 rounded-md border hover:bg-accent hover:text-accent-foreground cursor-pointer data-[state=checked]:bg-accent"
                onClick={() => handleToggleReport(report.id)}
                data-state={selectedReportIds.includes(report.id) ? "checked" : "unchecked"}
              >
                <Checkbox
                  id={`report-${report.id}`}
                  checked={selectedReportIds.includes(report.id)}
                  onCheckedChange={() => handleToggleReport(report.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={`report-${report.id}`} className="font-medium cursor-pointer">
                    {report.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAddClick} disabled={selectedReportIds.length === 0}>
            Add Selected ({selectedReportIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ModalWindow }; // Named export