import { useState, useEffect } from 'react';
import Chart from './Chart';
import { ChartType } from '@/types/chart';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

// Enhancing react-grid-layout with width provider
const ResponsiveGridLayout = WidthProvider(Responsive);

interface DraggableChartGridProps {
  charts: ChartType[];
  isEditMode: boolean;
  onRemoveChart: (id: string) => void;
  onLayoutChange: (layout: Layout[]) => void;
  onAskQuestion: (question: string, chartId: string, imageBase64?: string) => void;
  pageId: string;
  savedLayout?: { [key: string]: any };
  onPbiContainerRefChange?: (ref: HTMLDivElement | null, chartId: string) => void; // Add this line
  pbiVisualLoadingStates?: { [chartId: string]: boolean }; // Add this line
}

const DraggableChartGrid = ({
  charts,
  isEditMode,
  onRemoveChart,
  onLayoutChange,
  onAskQuestion,
  pageId,
  savedLayout,
  onPbiContainerRefChange, // Destructure new prop
  pbiVisualLoadingStates   // Destructure new prop
}: DraggableChartGridProps) => {
  // ... (existing state and useEffect for layouts) ...
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});

    useEffect(() => {
        if (savedLayout && savedLayout.lg) {
            const filteredLayout = savedLayout.lg.filter((layoutItem: Layout) =>
                charts.some(chart => chart.id === layoutItem.i)
            );
            // Ensure all charts have a layout entry, generate if missing
            const chartIdsWithLayout = new Set(filteredLayout.map(l => l.i));
            const chartsMissingLayout = charts.filter(c => !chartIdsWithLayout.has(c.id));

            const defaultLayoutsForMissing = chartsMissingLayout.map((chart, index) => ({
                i: chart.id,
                x: (index % 3) * 4,
                y: Math.floor(index / 3) * 10 + (Math.max(...filteredLayout.map(l => l.y + l.h), 0)), // Position after existing
                w: chart.layout?.w || 4,
                h: chart.layout?.h || 10,
                minW: chart.layout?.minW || 2,
                minH: chart.layout?.minH || 8,
            }));
            
            setLayouts({ lg: [...filteredLayout, ...defaultLayoutsForMissing] });

        } else {
            const defaultLayout = charts.map((chart, index) => ({
                i: chart.id,
                x: (index % 3) * 4,
                y: Math.floor(index / 3) * 10,
                w: chart.layout?.w || 4,
                h: chart.layout?.h || 10,
                minW: chart.layout?.minW || 2,
                minH: chart.layout?.minH || 8,
            }));
            setLayouts({ lg: defaultLayout });
        }
    }, [pageId, savedLayout, charts]);


  const handleLayoutChangeInternal = (currentLayout: Layout[]) => {
    const validLayout = currentLayout.filter(layoutItem =>
      charts.some(chart => chart.id === layoutItem.i)
    );
    setLayouts(prev => ({ ...prev, lg: validLayout }));
    onLayoutChange(validLayout);
  };

  // Handle layout changes and save to page
  const handleLayoutChange = (currentLayout: Layout[]) => {
    // Only include layout items for charts that actually exist
    const validLayout = currentLayout.filter(layoutItem => 
      charts.some(chart => chart.id === layoutItem.i)
    );
    
    const newLayouts = {
      ...layouts,
      lg: validLayout
    };
    
    setLayouts(newLayouts);
    onLayoutChange(validLayout);
  };

  const handleRemoveChart = (chartId: string) => {
    console.log('DraggableChartGrid: Removing chart', chartId);
    
    // Remove from layout first
    const updatedLayouts = {
      ...layouts,
      lg: layouts.lg ? layouts.lg.filter(item => item.i !== chartId) : []
    };
    setLayouts(updatedLayouts);
    
    // Then call the parent remove handler
    onRemoveChart(chartId);
  };

  return (
    <div className="p-0 md:p-4"> {/* Adjusted padding slightly for consistency */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        // ... (your existing RGL props)
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30} // Or your preferred row height
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChangeInternal}
        compactType="vertical"
        margin={[10, 10]} // Standard RGL margin
        containerPadding={[0,0]} // No internal padding for the grid itself
        draggableCancel=".chart-delete-button" // Important for the X button on charts
      >
        {charts.map((chart) => (
          <div key={chart.id} data-grid={chart.layout || {x:0,y:0,w:4,h:10}} className="h-full"> {/* Ensure data-grid is present */}
            <Chart
              chart={chart}
              isEditMode={isEditMode}
              onRemove={onRemoveChart}
              onAskQuestion={onAskQuestion}
              // Pass down PBI props with correct argument order
              onPbiContainerRefChange={
                chart.type === 'powerbi' && onPbiContainerRefChange
                  ? (chartId, element) => onPbiContainerRefChange(element, chartId)
                  : undefined
              }
              isPbiVisualLoading={pbiVisualLoadingStates ? pbiVisualLoadingStates[chart.id] : undefined}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DraggableChartGrid;