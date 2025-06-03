// src/components/EnhancedSidebar.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ChartType } from '@/types/chart';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancedSidebarProps {
  availableCharts: ChartType[];
  pageChartIds: string[];
  onToggleChart: (chartId: string) => void;
  onAddChart: (chartId: string) => void;
  isEditMode: boolean;
  isCurrentPageDefault: boolean; // <--- NEW PROP
}

const EnhancedSidebar = ({
  availableCharts,
  pageChartIds,
  onToggleChart,
  onAddChart,
  isEditMode,
  isCurrentPageDefault // <--- Destructure new prop
}: EnhancedSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  // Hide sidebar if not in edit mode OR if it's a default page
  if (!isEditMode || isCurrentPageDefault) { // <--- MODIFIED CONDITION
    return null;
  }

  return (
    <div
  className={`absolute top-0 left-0 h-full z-30 border-r border-border flex flex-col bg-[#091833]/80 dark:bg-gray-900/80 transition-all duration-300 ${
    collapsed ? "w-16" : "w-80"
  }`}
>

      <div className="flex justify-between items-center p-4 bg-background/50 backdrop-blur-sm">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Chart Library</h2>
            <Badge variant="secondary" className="text-xs">
              {pageChartIds.length}/{availableCharts.length}
            </Badge>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto hover:bg-background/80"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-auto p-4">
        {collapsed ? (
          <div className="flex flex-col items-center space-y-4">
            {availableCharts.map((chart) => (
              <TooltipProvider key={chart.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 transition-all duration-200 ${
                        pageChartIds.includes(chart.id)
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-background/80"
                      }`}
                      onClick={() => onToggleChart(chart.id)}
                    >
                      {chart.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{chart.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-white mb-4 font-medium">
              Drag charts to your dashboard or use checkboxes to add/remove them
            </div>
            {availableCharts.map((chart) => (
              <div
                key={chart.id}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                  pageChartIds.includes(chart.id)
                    ? "bg-[#091833] border border-primary/20 text-white"
                    : "hover:bg-[#091833] border border-transparent text-white"
                }`}
              >
                <Checkbox
                  id={`chart-${chart.id}`}
                  checked={pageChartIds.includes(chart.id)}
                  onCheckedChange={() => onToggleChart(chart.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0 text-primary">
                    {chart.icon}
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor={`chart-${chart.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {chart.name}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1 text-gray-400">
                      {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
                    </p>
                  </div>
                </div>
                {!pageChartIds.includes(chart.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onAddChart(chart.id)}
                  >
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSidebar;