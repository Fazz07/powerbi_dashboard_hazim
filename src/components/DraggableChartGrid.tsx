
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
}

const DraggableChartGrid = ({
  charts,
  isEditMode,
  onRemoveChart,
  onLayoutChange,
  onAskQuestion,
  pageId,
  savedLayout
}: DraggableChartGridProps) => {
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});

  // Load layout for current page
  useEffect(() => {
    if (savedLayout && savedLayout.lg) {
      // Filter the saved layout to only include charts that are actually visible
      const filteredLayout = savedLayout.lg.filter((layoutItem: Layout) => 
        charts.some(chart => chart.id === layoutItem.i)
      );
      setLayouts({ lg: filteredLayout });
    } else {
      // Generate default layout if no saved layout
      const defaultLayout = generateDefaultLayout();
      setLayouts({ lg: defaultLayout });
    }
  }, [pageId, savedLayout, charts]);

  // Generate default layout for charts without a stored position
  const generateDefaultLayout = () => {
    const defaultLayouts = charts.map((chart, index) => ({
      i: chart.id,
      x: (index % 3) * 4, // 3 columns per row
      y: Math.floor(index / 3) * 10, // Each chart occupies 10 height units
      w: 4, // Default width
      h: 10, // Default height - increased for better visibility
      minW: 2,
      minH: 8  // Minimum height increased
    }));
    return defaultLayouts;
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
    <div className="p-4">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={40}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
        margin={[16, 16]}
        containerPadding={[0, 0]}
        draggableCancel=".chart-delete-button"
      >
        {charts.map((chart) => (
          <div key={chart.id} className="h-full">
            <Chart
              chart={chart}
              isEditMode={isEditMode}
              onRemove={handleRemoveChart}
              onAskQuestion={onAskQuestion}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DraggableChartGrid;
