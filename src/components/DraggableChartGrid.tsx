import { useState, useEffect, useCallback } from 'react'; // Import useCallback
import Chart from './Chart';
import { ChartType } from '@/types/chart';
import { PowerBiEmbedData } from '@/services/powerBiUtils';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import * as pbi from 'powerbi-client'; // Import pbi for filter types

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DraggableChartGridProps {
  charts: ChartType[];
  isEditMode: boolean;
  onRemoveChart: (id: string) => void;
  onLayoutChange: (layout: Layout[]) => void;
  onAskQuestion: (question: string, chartId: string, imageBase64?: string) => void;
  pageId: string;
  savedLayout?: { [key: string]: any };
  mainEmbedData: PowerBiEmbedData | null;
}

const DraggableChartGrid = ({
  charts,
  isEditMode,
  onRemoveChart,
  onLayoutChange,
  onAskQuestion,
  pageId,
  savedLayout,
  mainEmbedData
}: DraggableChartGridProps) => {
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  // NEW: State to manage active filters, keyed by the chart ID that initiated the filter
  const [activeFilters, setActiveFilters] = useState<Record<string, pbi.models.IFilter[]>>({});

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
        x: (index % 3) * 4, // Default to 3 columns if no saved layout
        y: Math.floor(index / 3) * 10 + (Math.max(...filteredLayout.map(l => l.y + l.h), 0)),
        w: chart.layout?.w || 4, // Default width if not specified
        h: chart.layout?.h || 10,
        minW: chart.layout?.minW || 2,
        minH: chart.layout?.minH || 8,
      }));

      setLayouts({ lg: [...filteredLayout, ...defaultLayoutsForMissing] });

    } else {
      const defaultLayout = charts.map((chart, index) => ({
        i: chart.id,
        x: (index % 2) * 6, // Default to 2 columns (x=0, x=6) for new pages
        y: Math.floor(index / 2) * 10, // Adjust y based on 2 columns per row
        w: chart.layout?.w || 6, // Default to w=6 for 2 columns per row
        h: chart.layout?.h || 10,
        minW: chart.layout?.minW || 4,
        minH: chart.layout?.minH || 6,
      }));
      setLayouts({ lg: defaultLayout });
    }
    // NEW: Clear filters when page or charts change
    setActiveFilters({});
  }, [pageId, savedLayout, charts]);


  const handleLayoutChangeInternal = (currentLayout: Layout[]) => {
    const validLayout = currentLayout.filter(layoutItem =>
      charts.some(chart => chart.id === layoutItem.i)
    );
    setLayouts(prev => ({ ...prev, lg: validLayout }));
    onLayoutChange(validLayout);
  };

  const handleRemoveChart = (chartId: string) => {
    console.log('DraggableChartGrid: Removing chart', chartId);

    const updatedLayouts = {
      ...layouts,
      lg: layouts.lg ? layouts.lg.filter(item => item.i !== chartId) : []
    };
    setLayouts(updatedLayouts);

    // NEW: Also remove any filters associated with the removed chart
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[chartId];
      return newFilters;
    });

    onRemoveChart(chartId);
  };

  // NEW: Callback for when a visual's data is selected
  const handleVisualDataSelected = useCallback((sourceChartId: string, filters: pbi.models.IFilter[]) => {
    console.log(`[DraggableChartGrid] Data selected from ${sourceChartId}:`, filters);
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (filters.length > 0) {
        newFilters[sourceChartId] = filters;
      } else {
        delete newFilters[sourceChartId]; // Clear filters for this source chart
      }
      return newFilters;
    });
  }, []); // Empty dependency array means this callback is memoized

  return (
    <div className="p-0 md:p-4">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChangeInternal}
        compactType="vertical"
        margin={[10, 10]}
        containerPadding={[0, 0]}
        draggableCancel=".chart-delete-button"
      >
        {charts.map((chart) => {
          // NEW: Aggregate filters from all *other* charts for the current chart
          const filtersForThisChart = Object.entries(activeFilters)
            .filter(([id, _]) => id !== chart.id) // Exclude filters applied by THIS chart itself
            .flatMap(([_ , f]) => f); // Flatten all filter arrays into one

          return (
            <div key={chart.id} data-grid={chart.layout || { x: 0, y: 0, w: 6, h: 10 }} className="h-full">
              <Chart
                chart={chart}
                isEditMode={isEditMode}
                onRemove={onRemoveChart}
                onAskQuestion={onAskQuestion}
                mainEmbedData={mainEmbedData}
                currentFilters={filtersForThisChart} // Pass aggregated filters
                onVisualDataSelected={handleVisualDataSelected} // Pass callback for selections
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DraggableChartGrid;