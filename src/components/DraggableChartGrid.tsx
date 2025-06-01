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
  const prevPageId = useRef(pageId); 

  const [activeFilters, setActiveFilters] = useState<Record<string, pbi.models.IFilter[]>>({});

  useEffect(() => {
    console.log(`[DraggableChartGrid-${pageId}] Layout sync effect triggered.`);
    console.log(`[DraggableChartGrid-${pageId}] savedLayout prop:`, savedLayout);
    console.log(`[DraggableChartGrid-${pageId}] currentLayout state:`, currentLayout);
    
    const layoutFromSaved = savedLayout?.lg || [];
    let newLayout = [...layoutFromSaved];

    const currentChartIds = new Set(charts.map(c => c.id));
    
    newLayout = newLayout.filter(layoutItem => currentChartIds.has(layoutItem.i));

    const layoutItemsPresent = new Set(newLayout.map(l => l.i));
    const chartsToAdd = charts.filter(chart => !layoutItemsPresent.has(chart.id));

    if (chartsToAdd.length > 0) {
      console.log(`[DraggableChartGrid-${pageId}] Found new charts to add to layout:`, chartsToAdd.map(c => c.id));
      const defaultLayoutsForNewCharts = chartsToAdd.map((chart) => {
        const defaultW = chart.layout?.w || 4; // Default to 4 columns if not specified
        const defaultH = chart.layout?.h || 10;
        const defaultMinW = chart.layout?.minW || 1; // Default minW to 1
        const defaultMinH = chart.layout?.minH || 6;
        const defaultMaxW = chart.layout?.maxW || 12; // Default maxW to 12

        return {
          i: chart.id,
          x: 0, 
          y: Infinity, 
          w: defaultW,
          h: defaultH,
          minW: defaultMinW,
          minH: defaultMinH,
          maxW: defaultMaxW,
        };
      });
      newLayout = [...newLayout, ...defaultLayoutsForNewCharts];
    }

    // Critically: Ensure all items in the final newLayout have consistent minW/maxW
    // This is important because 'savedLayout' items might not have minW/maxW defined.
    newLayout = newLayout.map(item => ({
        ...item,
        minW: item.minW || 1, // Default minW to 1 if not explicitly set
        maxW: item.maxW || 12 // Default maxW to 12 if not explicitly set
    }));

    if (JSON.stringify(newLayout) !== JSON.stringify(currentLayout)) {
      console.log(`[DraggableChartGrid-${pageId}] Updating internal layout. New:`, newLayout);
      setCurrentLayout(newLayout);
      onLayoutChange(newLayout); 
    } else {
        console.log(`[DraggableChartGrid-${pageId}] Calculated layout is identical, skipping state update.`);
    }

  }, [pageId, savedLayout, charts, onLayoutChange, currentLayout]); // Added currentLayout to deps to prevent infinite loop of layout identical but currentLayout not up to date in component. Remove if performance issue.


  useEffect(() => {
    if (pageId !== prevPageId.current) {
        console.log(`[DraggableChartGrid-${pageId}] Page ID changed (${prevPageId.current} -> ${pageId}). Clearing active filters.`);
        setActiveFilters({});
        prevPageId.current = pageId; 
    }
  }, [pageId]); 


  const handleLayoutChangeInternal = useCallback((layout: Layout[]) => {
    console.log('[DraggableChartGrid] RGL internal layout change:', layout);
    setCurrentLayout(layout);
    onLayoutChange(layout);
  }, [onLayoutChange]);


  const handleRemoveChart = useCallback((chartId: string) => {
    console.log('[DraggableChartGrid] Removing chart', chartId);

    setCurrentLayout(prevLayout => prevLayout.filter(item => item.i !== chartId));

    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[chartId];
      return newFilters;
    });

    onRemoveChart(chartId); 
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
    <div className="w-full h-full p-4 md:p-6"> 
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: currentLayout }} 
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={45} 
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChangeInternal}
        compactType="vertical"
        margin={[10, 10]}
        containerPadding={[0, 0]}
        draggableCancel=".chart-delete-button"
      >
        {charts.map((chart) => {
          const layoutItem = currentLayout.find(item => item.i === chart.id);
          if (!layoutItem) {
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