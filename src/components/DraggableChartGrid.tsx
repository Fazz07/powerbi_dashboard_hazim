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
  // onAskQuestion now accepts question, chartId, chartDataForLLM, and chartContentForDisplay
  onAskQuestion: (question: string, chartId: string, chartDataForLLM?: string, chartContentForDisplay?: string) => void;
  // NEW PROPS:
  hiddenPbiReportInstance: pbi.Report | null;
  isHiddenPbiReportLoaded: boolean;
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
  // NEW PROPS:
  hiddenPbiReportInstance,
  isHiddenPbiReportLoaded,
}: DraggableChartGridProps) => {
  const [currentLayout, setCurrentLayout] = useState<Layout[]>([]);
  const isInitialLoad = useRef(true);
  const prevPageId = useRef(pageId);

  const [activeFilters, setActiveFilters] = useState<Record<string, pbi.models.IFilter[]>>({});

  useEffect(() => {
    if (isInitialLoad.current || pageId !== prevPageId.current) {
      const layoutToApply = savedLayout?.lg || [];
      const filteredLayout = layoutToApply.filter((layoutItem: Layout) =>
        charts.some(chart => chart.id === layoutItem.i)
      );

      const chartIdsInLayout = new Set(filteredLayout.map(l => l.i));
      const chartsNotInLayout = charts.filter(c => !chartIdsInLayout.has(c.id));

      const defaultLayoutsForMissing = chartsNotInLayout.map((chart, index) => {
        const existingChartsCount = filteredLayout.length;
        const totalChartsCurrently = existingChartsCount + index;
        
        const cols = 12;
        const defaultW = chart.layout?.w || 6;
        const defaultH = chart.layout?.h || 10;
        
        const maxY = filteredLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
        
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
      onLayoutChange(finalLayout);

      isInitialLoad.current = false;
    }
    setActiveFilters({});
  }, [pageId, savedLayout, charts, onLayoutChange]);


  useEffect(() => {
    prevPageId.current = pageId;
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
    <div className="p-0 md:p-4">
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: currentLayout }}
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
          const layoutItem = currentLayout.find(item => item.i === chart.id);
          if (!layoutItem) {
              console.warn(`[DraggableChartGrid] No layout found for chart ${chart.id}, skipping render.`);
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
                // NEW PROPS: Pass the hidden report instance and its loaded status
                hiddenPbiReportInstance={hiddenPbiReportInstance}
                isHiddenPbiReportLoaded={isHiddenPbiReportLoaded}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DraggableChartGrid;