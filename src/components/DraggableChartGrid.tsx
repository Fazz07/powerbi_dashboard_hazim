import { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
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
  pageId: string;
  savedLayout?: { [key: string]: Layout[] }; // Explicitly type savedLayout
  mainEmbedData: PowerBiEmbedData | null;
  onAskQuestion: (question: string, chartId: string, imageBase64?: string) => void;
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
  // Use `currentLayout` to avoid re-initializing on every render
  // RGL recommends managing layout state internally and only passing it when you want to externalize it
  const [currentLayout, setCurrentLayout] = useState<Layout[]>([]);
  const isInitialLoad = useRef(true); // Flag for initial load or page change
  const prevPageId = useRef(pageId); // Ref to track previous pageId

  // NEW: State to manage active filters, keyed by the chart ID that initiated the filter
  const [activeFilters, setActiveFilters] = useState<Record<string, pbi.models.IFilter[]>>({});

  useEffect(() => {
    // This effect should only run when the pageId changes, or on initial mount,
    // to sync RGL's internal state with the saved state.
    if (isInitialLoad.current || pageId !== prevPageId.current) {
      const layoutToApply = savedLayout?.lg || [];
      const filteredLayout = layoutToApply.filter((layoutItem: Layout) =>
        charts.some(chart => chart.id === layoutItem.i) // Ensure chart exists on current page
      );

      const chartIdsInLayout = new Set(filteredLayout.map(l => l.i));
      const chartsNotInLayout = charts.filter(c => !chartIdsInLayout.has(c.id));

      // Generate default layouts for charts not yet in the layout
      const defaultLayoutsForMissing = chartsNotInLayout.map((chart, index) => {
        // Calculate a reasonable starting position for new charts
        // This attempts to place them after existing charts, forming rows.
        const existingChartsCount = filteredLayout.length;
        const totalChartsCurrently = existingChartsCount + index;
        
        const cols = 12; // RGL grid columns
        const defaultW = chart.layout?.w || 6;
        const defaultH = chart.layout?.h || 10;
        
        // Find the maximum Y position from existing filtered layouts to place new charts below
        const maxY = filteredLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
        
        // Simple sequential placement, wrapping to next row if needed
        let x = (totalChartsCurrently * defaultW) % cols;
        let y = maxY + Math.floor(totalChartsCurrently * defaultW / cols) * defaultH;


        return {
          i: chart.id,
          x: x,
          y: y,
          w: defaultW,
          h: defaultH,
          minW: chart.layout?.minW || 4,
          minH: chart.layout?.minH || 6,
        };
      });
      const finalLayout = [...filteredLayout, ...defaultLayoutsForMissing];

      console.log(`[DraggableChartGrid-${pageId}] Initializing/re-initializing layout. Saved:`, savedLayout, "Final:", finalLayout);
      setCurrentLayout(finalLayout);
      // Call the parent's onLayoutChange to ensure the initial or merged layout is saved
      onLayoutChange(finalLayout);

      isInitialLoad.current = false;
    }
    // NEW: Clear filters when page or charts change
    setActiveFilters({});
  }, [pageId, savedLayout, charts, onLayoutChange]); // Added onLayoutChange to dependencies


  // This ref helps track pageId changes for the effect above
  useEffect(() => {
    prevPageId.current = pageId;
  }, [pageId]);


  const handleLayoutChangeInternal = useCallback((layout: Layout[]) => {
    console.log('[DraggableChartGrid] RGL internal layout change:', layout);
    setCurrentLayout(layout); // Update local state for RGL to render
    onLayoutChange(layout);   // Notify parent for persistence
  }, [onLayoutChange]);


  const handleRemoveChart = useCallback((chartId: string) => {
    console.log('[DraggableChartGrid] Removing chart', chartId);

    // Update internal layout state immediately
    setCurrentLayout(prevLayout => prevLayout.filter(item => item.i !== chartId));

    // Also remove any filters associated with the removed chart
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[chartId];
      return newFilters;
    });

    onRemoveChart(chartId); // Notify parent component
  }, [onRemoveChart]); // Add onRemoveChart to dependencies

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
        layouts={{ lg: currentLayout }} // Use internal state
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
          // Find the layout for this specific chart from currentLayout state
          const layoutItem = currentLayout.find(item => item.i === chart.id);
          if (!layoutItem) {
              // This should ideally not happen if useEffect properly initializes/updates currentLayout
              // or if new charts are added, default layouts are generated.
              console.warn(`[DraggableChartGrid] No layout found for chart ${chart.id}, skipping render.`);
              return null;
          }
          // NEW: Aggregate filters from all *other* charts for the current chart
          const filtersForThisChart = Object.entries(activeFilters)
            .filter(([id, _]) => id !== chart.id) // Exclude filters applied by THIS chart itself
            .flatMap(([_ , f]) => f); // Flatten all filter arrays into one

          return (
            <div key={chart.id} data-grid={layoutItem} className="h-full">
              <Chart
                chart={chart}
                isEditMode={isEditMode}
                onRemove={handleRemoveChart} // Use the memoized handler
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