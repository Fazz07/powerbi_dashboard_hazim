
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ChartType } from '@/types/chart';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  availableCharts: ChartType[];
  visibleCharts: ChartType[];
  onToggleChart: (chartId: string) => void;
  onAddChart: (chartId: string) => void;
}

const Sidebar = ({ 
  availableCharts, 
  visibleCharts, 
  onToggleChart, 
  onAddChart 
}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div 
      className={`border-r border-border flex flex-col h-[calc(100vh-3.5rem)] bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex justify-between items-center p-4">
        {!collapsed && <h2 className="font-semibold">Chart Library</h2>}
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto" 
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
                      className={`h-8 w-8 ${
                        visibleCharts.some(c => c.id === chart.id) 
                          ? "bg-accent text-accent-foreground" 
                          : ""
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
          <div className="space-y-4">
            {availableCharts.map((chart) => (
              <div key={chart.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`chart-${chart.id}`}
                  checked={visibleCharts.some(c => c.id === chart.id)}
                  onCheckedChange={() => onToggleChart(chart.id)}
                />
                <label
                  htmlFor={`chart-${chart.id}`}
                  className="flex items-center space-x-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <span>{chart.icon}</span>
                  <span>{chart.name}</span>
                </label>
                {!visibleCharts.some(c => c.id === chart.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6"
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

export default Sidebar;
