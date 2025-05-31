// src/components/DraggableChartGrid.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import Chart from './Chart';
import { ChartType } from '@/types/chart';
import { PowerBiEmbedData } from '@/services/powerBiUtils';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import * as pbi from 'powerbi-client';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DraggableChartGridProps {
  charts: ChartType[];
  isEditMode: boolean;
  onRemoveChart: (id: string) => void;
  onLayoutChange: (layout: Layout[]) => void;
  pageId: string;
  savedLayout?: { [key: string]: Layout[] };
  mainEmbedData: PowerBiEmbedData | null;
  onAskQuestion: (question: string, chartId: string) => void;
  hiddenPbiReportInstance: pbi.Report | null;
  isHiddenPbiReportLoaded: boolean;
  isDataLoading?: boolean;
}

const DraggableChartGrid = ({
  charts,
  isEditMode,
  onRemoveChart,
  onLayoutChange,
  onAskQuestion,
  pageId,
  savedLayout,
  mainEmbedData,
  hiddenPbiReportInstance,
  isHiddenPbiReportLoaded,
  isDataLoading
}: DraggableChartGridProps) => {
  const [currentLayout, setCurrentLayout] = useState<Layout[]>([]);
  // Removed isInitialLoad ref as the new useEffect will handle sync more directly
  const prevPageId = useRef(pageId); // Keep this for clearing filters on page change

  const [activeFilters, setActiveFilters] = useState<Record<string, pbi.models.IFilter[]>>({});

  // Effect to manage layout synchronization with 'charts' and 'savedLayout'
  // This will run on initial mount, pageId changes, and 'charts' prop changes.
  useEffect(() => {
    console.log(`[DraggableChartGrid-${pageId}] Layout sync effect triggered.`);
    
    // Start with the saved layout for the current page
    const layoutFromSaved = savedLayout?.lg || [];
    let newLayout = [...layoutFromSaved];

    // Get IDs of charts currently intended to be on this page
    const currentChartIds = new Set(charts.map(c => c.id));
    
    // 1. Remove layout items for charts that are no longer in 'charts' prop
    newLayout = newLayout.filter(layoutItem => currentChartIds.has(layoutItem.i));

    // 2. Add layout items for charts in 'charts' prop that are not yet in the layout
    const layoutItemsPresent = new Set(newLayout.map(l => l.i));
    const chartsToAdd = charts.filter(chart => !layoutItemsPresent.has(chart.id));

    if (chartsToAdd.length > 0) {
      console.log(`[DraggableChartGrid-${pageId}] Found new charts to add to layout:`, chartsToAdd.map(c => c.id));
      const defaultLayoutsForNewCharts = chartsToAdd.map((chart) => {
        // Simple heuristic for placement at the bottom (RGL will arrange them)
        const cols = 12; // Assuming default lg cols
        const defaultW = chart.layout?.w || 6;
        const defaultH = chart.layout?.h || 10;
        
        // Find the maximum Y position in the current layout
        const maxY = newLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

        // Place new charts starting from a new row, or next available column
        // This simple logic attempts to stack them at the bottom.
        let nextX = 0;
        let nextY = maxY;
        if (newLayout.length > 0) {
            // Try to find an empty spot in the last row or start a new row
            const lastRowItems = newLayout.filter(item => item.y === maxY);
            const takenXsInLastRow = lastRowItems.map(item => item.x);
            // Simple approach: if less than 2 items in last row, place next to them, else new row
            if (takenXsInLastRow.length < (cols / defaultW)) { // If there's space for one more item in the current row
                nextX = (lastRowItems.length % (cols / defaultW)) * defaultW;
            } else {
                nextY += defaultH; // Start a new row
            }
        }

        return {
          i: chart.id,
          x: nextX, // Use an X that allows for horizontal placement, or 0 for new row
          y: Infinity, // RGL will place it effectively at the bottom based on available space
          w: defaultW,
          h: defaultH,
          minW: chart.layout?.minW || 4,
          minH: chart.layout?.minH || 6,
        };
      });
      newLayout = [...newLayout, ...defaultLayoutsForNewCharts];
    }

    // 3. Compare with currentLayout state to avoid unnecessary updates
    // This is important because the 'charts' prop might change frequently
    // due to re-renders of Dashboard.tsx, but the actual layout might not need updating.
    if (JSON.stringify(newLayout) !== JSON.stringify(currentLayout)) {
      console.log(`[DraggableChartGrid-${pageId}] Updating internal layout. New:`, newLayout);
      setCurrentLayout(newLayout);
      onLayoutChange(newLayout); // Persist this updated layout to usePageManager
    } else {
        console.log(`[DraggableChartGrid-${pageId}] Calculated layout is identical, skipping state update.`);
    }

    // Reset initialLoad flag for future page changes
    // isInitialLoad.current = false; // This line is no longer strictly necessary with the new logic, but harmless.

  }, [pageId, savedLayout, charts, onLayoutChange]); // Dependencies: pageId (for full resets), savedLayout (for initial load), charts (for add/remove), onLayoutChange (stable callback)


  // Effect to clear filters specifically when the page changes
  useEffect(() => {
    if (pageId !== prevPageId.current) {
        console.log(`[DraggableChartGrid-${pageId}] Page ID changed (${prevPageId.current} -> ${pageId}). Clearing active filters.`);
        setActiveFilters({});
        prevPageId.current = pageId; // Update ref for next comparison
    }
  }, [pageId]); // Only depends on pageId


  const handleLayoutChangeInternal = useCallback((layout: Layout[]) => {
    console.log('[DraggableChartGrid] RGL internal layout change:', layout);
    setCurrentLayout(layout);
    onLayoutChange(layout);
  }, [onLayoutChange]);


  const handleRemoveChart = useCallback((chartId: string) => {
    console.log('[DraggableChartGrid] Removing chart', chartId);

    // Filter the current layout to remove the item
    // The main layout effect above will also pick this up via 'charts' prop,
    // but this immediate update provides better responsiveness.
    setCurrentLayout(prevLayout => prevLayout.filter(item => item.i !== chartId));

    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[chartId];
      return newFilters;
    });

    onRemoveChart(chartId); // This updates currentPage.charts, which triggers the main layout effect.
  }, [onRemoveChart]);

  const handleVisualDataSelected = useCallback((sourceChartId: string, filters: pbi.models.IFilter[]) => {
    console.log(`[DraggableChartGrid] Data selected from ${sourceChartId}:`, filters);
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (filters.length > 0) {
        newFilters[sourceChartId] = filters;
      } else {
        delete newFilters[sourceChartId];
      }
      return newFilters;
    });
  }, []);

  return (
    <div className="p-0 md:p-4">
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: currentLayout }} // Use the currentLayout state
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={45} // Changed from 30 to 50
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChangeInternal}
        compactType="vertical"
        margin={[10, 10]}
        containerPadding={[0, 0]}
        draggableCancel=".chart-delete-button"
      >
        {charts.map((chart) => {
          // Ensure a layout item exists for the chart before rendering
          const layoutItem = currentLayout.find(item => item.i === chart.id);
          if (!layoutItem) {
              // This should ideally not happen if the layout effect is working correctly,
              // but as a safeguard, you might log a warning or return null.
              console.warn(`[DraggableChartGrid] Chart ${chart.id} is in 'charts' prop but has no layout item. Skipping render.`);
              return null;
          }
          const filtersForThisChart = Object.entries(activeFilters)
            .filter(([id, _]) => id !== chart.id)
            .flatMap(([_ , f]) => f);

          return (
            <div key={chart.id} data-grid={layoutItem} className="h-full">
              <Chart
                chart={chart}
                isEditMode={isEditMode}
                onRemove={handleRemoveChart}
                onAskQuestion={onAskQuestion}
                mainEmbedData={mainEmbedData}
                currentFilters={filtersForThisChart}
                onVisualDataSelected={handleVisualDataSelected}
                hiddenPbiReportInstance={hiddenPbiReportInstance}
                isHiddenPbiReportLoaded={isHiddenPbiReportLoaded}
                isDataLoading={isDataLoading}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DraggableChartGrid;