// src/components/Chart.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartType } from '@/types/chart';
import { X, Loader2 } from 'lucide-react';
import { svgToDataUrl } from '@/utils/svgUtils';
import { captureIframeAsImage } from '@/utils/iframeUtils';
import { useToast } from '@/hooks/use-toast';
import * as pbi from 'powerbi-client';
import { powerBiService, PowerBiEmbedData } from '@/services/powerBiUtils';
import { parseData } from '@/utils/dataParsing'; // Keep this import, but its use for LLM data is removed.

interface ChartProps {
  chart: ChartType;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onAskQuestion: (question: string, chartId: string, chartDataForLLM?: string, chartContentForDisplay?: string) => void;
  mainEmbedData: PowerBiEmbedData | null;
  currentFilters: pbi.models.IFilter[];
  onVisualDataSelected: (chartId: string, filters: pbi.models.IFilter[]) => void;
  // NEW PROPS:
  hiddenPbiReportInstance: pbi.Report | null;
  isHiddenPbiReportLoaded: boolean;
}

const Chart = ({
  chart,
  isEditMode,
  onRemove,
  onAskQuestion,
  mainEmbedData,
  currentFilters,
  onVisualDataSelected,
  // NEW PROPS:
  hiddenPbiReportInstance,
  isHiddenPbiReportLoaded,
}: ChartProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pbiLoading, setPbiLoading] = useState(true); // For the visible visual
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const pbiContainerRef = useRef<HTMLDivElement>(null); // For the visible visual
  const isMounted = useRef(true);
  const [pbiVisual, setPbiVisual] = useState<pbi.Visual | null>(null); // For the visible visual

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (pbiContainerRef.current) {
        console.log(`[Chart-${chart.id}] Cleaning up PBI embed instance on unmount.`);
        powerBiService.reset(pbiContainerRef.current);
      }
    };
  }, [chart.id]);

  console.log(`[Chart-${chart.id}] Render. Type: ${chart.type}, Name: ${chart.name}, pbiLoading: ${pbiLoading}, PBI Config:`, chart.powerBiConfig);

  // Effect to embed the *visible* Power BI visual
  useEffect(() => {
    if (chart.type !== 'powerbi' || !chart.powerBiConfig || !mainEmbedData || !pbiContainerRef.current) {
      console.log(`[Chart-${chart.id}] PBI visual embed conditions not met. Type: ${chart.type}, Has Config: ${!!chart.powerBiConfig}, Has Main Embed Data: ${!!mainEmbedData}, Has Container Ref: ${!!pbiContainerRef.current}`);
      if (isMounted.current && chart.type === 'powerbi' && pbiLoading) {
        setPbiLoading(false);
      }
      return;
    }

    const container = pbiContainerRef.current;
    const { pageName, visualName } = chart.powerBiConfig;
    const { token, embedUrl, reportId } = mainEmbedData;

    console.log(`[Chart-${chart.id}] Attempting to embed VISIBLE PBI visual. ReportId: ${reportId}, Page: ${pageName}, Visual: ${visualName}, EmbedUrl: ${embedUrl}`);
    if (isMounted.current) {
      setPbiLoading(true);
    }

    powerBiService.reset(container);

    const config: pbi.IVisualEmbedConfiguration = {
      type: 'visual', // Embed as a visual for display
      accessToken: token,
      embedUrl: embedUrl,
      id: reportId,
      pageName: pageName,
      visualName: visualName,
      permissions: pbi.models.Permissions.Read,
      tokenType: pbi.models.TokenType.Embed,
      settings: {
        filterPaneEnabled: false,
        navContentPaneEnabled: false,
      }
    };

    let visual: pbi.Visual | undefined;

    try {
      visual = powerBiService.embed(container, config) as pbi.Visual;
      setPbiVisual(visual);

      visual.off("loaded");
      visual.off("error");
      visual.off("rendered");
      visual.off("dataSelected");

      visual.on("loaded", () => {
        console.log(`[Chart-${chart.id}] Visible Power BI visual loaded.`);
      });

      visual.on("rendered", () => {
        console.log(`[Chart-${chart.id}] Visible Power BI visual rendered.`);
        if (isMounted.current) {
          setPbiLoading(false);
        }
      });

      visual.on("error", (event) => {
        console.error(`[Chart-${chart.id}] Visible Power BI visual error:`, event.detail);
        if (isMounted.current) {
          setPbiLoading(false);
          const errorMessage = (event.detail as any)?.message || 'Unknown error occurred during Power BI embedding.';
          toast({ title: "Power BI Error", description: `Failed to load ${chart.name}: ${errorMessage}`, variant: "destructive", duration: 5000 });
        }
      });

      visual.on("dataSelected", (event) => {
        const dataSelectedEvent = event.detail as any;
        console.log(`[Chart-${chart.id}] Data selected event:`, dataSelectedEvent);

        const filters: pbi.models.IFilter[] = [];

        if (dataSelectedEvent.dataPoints && dataSelectedEvent.dataPoints.length > 0) {
          dataSelectedEvent.dataPoints.forEach((dp: any) => {
            if (dp.identity && dp.identity.length > 0) {
              dp.identity.forEach((id: any) => {
                if (id.target && typeof id.target === 'object' && 'table' in id.target && 'column' in id.target && id.equals !== undefined) {
                  filters.push({
                    $schema: "http://powerbi.com/product/schema#basic",
                    target: {
                      table: id.target.table,
                      column: id.target.column
                    },
                    operator: "In",
                    values: [id.equals]
                  } as pbi.models.IBasicFilter);
                }
              });
            }
          });
          onVisualDataSelected(chart.id, filters);
        } else {
          console.log(`[Chart-${chart.id}] Selection cleared or no data points.`);
          onVisualDataSelected(chart.id, []);
        }
      });

    } catch (error) {
      console.error(`[Chart-${chart.id}] Failed to call powerBiService.embed for visible visual:`, error);
      if (isMounted.current) {
        setPbiLoading(false);
        toast({ title: "Power BI Embedding Failed", description: `Could not start embedding for ${chart.name}. Check console.`, variant: "destructive", duration: 5000 });
      }
    }

    return () => {
      setPbiVisual(null);
      if (container) {
        powerBiService.reset(container);
      }
    };
  }, [
    chart.id,
    chart.type,
    chart.powerBiConfig?.pageName,
    chart.powerBiConfig?.visualName,
    mainEmbedData?.token,
    mainEmbedData?.embedUrl,
    mainEmbedData?.reportId,
    toast,
    onVisualDataSelected
  ]);


  useEffect(() => {
    if (pbiVisual && chart.type === 'powerbi') {
      if (currentFilters && currentFilters.length > 0) {
        console.log(`[Chart-${chart.id}] Applying filters:`, currentFilters);
        pbiVisual.setFilters(currentFilters)
          .catch(error => console.error(`[Chart-${chart.id}] Failed to apply filters:`, error));
      } else {
        console.log(`[Chart-${chart.id}] Clearing filters.`);
        pbiVisual.setFilters([])
          .catch(error => console.error(`[Chart-${chart.id}] Failed to clear filters:`, error));
      }
    }
  }, [pbiVisual, currentFilters, chart.type]);


  useEffect(() => {
    console.log(`[Chart-${chart.id}] Screenshot logic. Type: ${chart.type}, Content: ${chart.content ? chart.content.substring(0, 30) + '...' : 'N/A'}`);
    if (chart.type === 'iframe' || chart.type === 'powerbi') {
      setScreenshotUrl(null);
      return;
    }

    const captureChartImage = async () => {
      if (chart.content) {
        try {
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'absolute';
          tempContainer.style.left = '-9999px';
          tempContainer.style.width = '500px';
          tempContainer.style.height = '300px';
          tempContainer.innerHTML = chart.content;
          document.body.appendChild(tempContainer);

          await new Promise(resolve => setTimeout(resolve, 100));

          const svgElement = tempContainer.querySelector('svg');
          if (svgElement) {
            const dataUrl = await svgToDataUrl(svgElement);
            if (isMounted.current) {
              setScreenshotUrl(dataUrl);
            }
          } else {
            console.warn(`[Chart-${chart.id}] No SVG element found in content for screenshot.`);
            if (isMounted.current) {
              setScreenshotUrl(null);
            }
          }
          document.body.removeChild(tempContainer);
        } catch (error) {
          console.error(`[Chart-${chart.id}] Failed to capture chart image:`, error);
          if (isMounted.current) {
            setScreenshotUrl(null);
          }
        }
      } else {
        if (isMounted.current) {
          setScreenshotUrl(null);
        }
      }
    };

    const timer = setTimeout(captureChartImage, 300);
    return () => clearTimeout(timer);
  }, [chart.content, chart.type]);


  const handleAskQuestion = async (question: string) => {
    setIsLoading(true);
    console.log(`[Chart-${chart.id}] handleAskQuestion for display content: ${question}`);
    try {
      let contentForDisplay: string | undefined;
      let dataForLLM: string | undefined;

      if (chart.type === 'powerbi') {
        // NEW LOGIC FOR POWER BI DATA EXTRACTION
        if (!hiddenPbiReportInstance || !isHiddenPbiReportLoaded) {
          toast({ title: "Power BI Data Not Ready", description: "Please wait for the Power BI report to fully load for data extraction.", duration: 3000 });
          setIsLoading(false);
          return;
        }
        if (!chart.powerBiConfig) {
          toast({ title: "Chart Configuration Error", description: "Power BI visual configuration is missing.", variant: "destructive", duration: 3000 });
          setIsLoading(false);
          return;
        }

        try {
          toast({ title: "Connecting", description: `please wait..` });
          const { pageName, visualName } = chart.powerBiConfig;

          // 1. Get the pages from the hidden report instance
          const pages = await hiddenPbiReportInstance.getPages();
          const targetPage = pages.find(p => p.name === pageName);

          if (!targetPage) {
            throw new Error(`Page '${pageName}' not found in the Power BI report.`);
          }

          // **********************************************
          // CRITICAL FIX: Activate the page before getting visuals and exporting data
          await targetPage.setActive();
          console.log(`[Chart-${chart.id}] Page '${pageName}' activated in hidden report.`);
          // **********************************************

          // 2. Get the visuals from the target page (which is now active)
          const visualsOnPage = await targetPage.getVisuals();
          const targetVisual = visualsOnPage.find(v => v.name === visualName);

          if (!targetVisual) {
            throw new Error(`Visual '${visualName}' not found on page '${pageName}'.`);
          }

          // 3. Export data from the target visual
          if (typeof (targetVisual as any).exportData === 'function') {
            const exportResult = await (targetVisual as any).exportData(pbi.models.ExportDataType.Summarized);
            if (exportResult && exportResult.data) {
              dataForLLM = exportResult.data; // Raw CSV data
              console.log(`[Chart-${chart.id}] Exported PBI data for LLM (raw CSV sent):`, dataForLLM.substring(0, Math.min(dataForLLM.length, 200)) + '...');
              contentForDisplay = `Power BI Visual: ${chart.name} (Page: ${pageName}, Visual: ${visualName}). Data snapshot (full CSV sent to AI).`;
            } else {
              console.warn(`[Chart-${chart.id}] No data found after exporting from PBI visual.`);
              dataForLLM = `No data found for Power BI visual: ${chart.name}.`;
              contentForDisplay = `Power BI Visual: ${chart.name} (Page: ${pageName}, Visual: ${visualName}). No data could be extracted.`;
            }
          } else {
            console.error(`[Chart-${chart.id}] exportData method unexpectedly missing on target visual!`);
            dataForLLM = `Error: exportData method not available for Power BI visual: ${chart.name}.`;
            contentForDisplay = `Power BI Visual: ${chart.name} (Data export API not available).`;
          }
          toast({ title: "Successfull", description: `please view AI's response.` });

        } catch (exportError: any) {
          console.error(`[Chart-${chart.id}] Failed to export data from PBI visual (new logic):`, exportError);
          toast({ title: "Data Export Failed", description: `Could not export data from ${chart.name}: ${exportError.message || 'unknown error'}`, variant: "destructive" });
          dataForLLM = `Failed to export data from Power BI visual: ${chart.name}. Error: ${exportError.message || 'unknown'}`;
          contentForDisplay = `Power BI Visual: ${chart.name}. (Data export failed)`;
        }
      } else if (chart.type === 'iframe') {
        try {
          toast({ title: "Capturing chart", description: "Taking a snapshot of the Power BI report..." });
          const imageDataUrl = await captureIframeAsImage(chart.content);
          contentForDisplay = imageDataUrl;
          dataForLLM = `The user is referencing a full Power BI report embedded via iframe. The URL is: ${chart.content}. A visual placeholder is provided for context.`;
          console.log(`[Chart-${chart.id}] Iframe content for display (placeholder image data or URL):`, contentForDisplay ? contentForDisplay.substring(0, 50) + '...' : 'N/A');
        } catch (error) {
          console.error(`[Chart-${chart.id}] Failed to capture iframe as image for display:`, error);
          toast({ title: "Capture failed", description: "Using URL reference instead", variant: "destructive" });
          contentForDisplay = chart.content;
          dataForLLM = `The user is referencing a full Power BI report embedded via iframe. The URL is: ${chart.content}. (Failed to capture image).`;
        }
      } else { // SVG based charts
        if (chart.content) {
          try {
            toast({ title: "Capturing chart", description: "Converting chart SVG to image for AI..." });
            const imageDataUrl = await svgToDataUrl(chart.content);
            contentForDisplay = imageDataUrl;
            dataForLLM = chart.content;
            console.log(`[Chart-${chart.id}] SVG content for display (image data):`, contentForDisplay ? contentForDisplay.substring(0, 50) + '...' : 'N/A');
          } catch (error) {
            console.error(`[Chart-${chart.id}] Failed to convert SVG to image for display:`, error);
            toast({ title: "Capture failed", description: "Using raw SVG content instead", variant: "destructive" });
            contentForDisplay = chart.content;
            dataForLLM = chart.content;
          }
        } else {
          contentForDisplay = "No chart content available.";
          dataForLLM = "No chart content available.";
        }
      }
      onAskQuestion(question, chart.id, dataForLLM, contentForDisplay);
    } catch (error) {
      console.error(`[Chart-${chart.id}] Failed to process chart content for display/data (outer catch):`, error);
      onAskQuestion(question, chart.id, "Error processing chart data.", chart.content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[Chart-${chart.id}] handleDeleteClick`);
    onRemove(chart.id);
  };

  let actualChartContent: React.ReactNode;
  if (chart.type === 'powerbi') {
    actualChartContent = (
      <>
        {pbiLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
            <span className="text-muted-foreground">Loading Power BI Visual...</span>
          </div>
        )}
        <div
          ref={pbiContainerRef}
          style={{ width: '100%', height: '100%', opacity: pbiLoading ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}
        />
      </>
    );
  } else if (chart.type === 'iframe') {
    actualChartContent = (
      <iframe
        src={chart.content}
        title={chart.name}
        className="w-full h-full border-none"
        allowFullScreen
      />
    );
  } else { // SVG based charts
    actualChartContent = (
      <div className="w-full h-full flex items-center justify-center p-4">
        {screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt={chart.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <p className="text-muted-foreground">Loading chart image...</p>
        )}
      </div>
    );
  }

  return (
    <Card ref={chartRef} className="overflow-hidden relative flex flex-col h-full">
      {isEditMode && chart.type !== 'powerbi' && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-10 chart-delete-button"
          onClick={handleDeleteClick}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          aria-label="Remove chart"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">{chart.name}</h3>
      </div>

      <div
        className="flex-1 min-h-[300px] bg-background relative flex items-center justify-center"
        id={`chart-content-wrapper-${chart.id}`}
      >
        {actualChartContent}
      </div>

      <div className="p-4 bg-muted/10 border-t">
        <h4 className="text-sm font-medium mb-2">Ask AI about this chart:</h4>
        <div className="grid grid-cols-1 gap-2">
          {(chart.askableQuestions || []).map((question, idx) => (
            <Button
              key={idx}
              variant="secondary"
              size="sm"
              className="text-left justify-start text-xs"
              onClick={() => handleAskQuestion(question)}
              // Disable if any loading is happening, or if it's a PBI chart and the hidden report isn't loaded
              disabled={isLoading || pbiLoading || (chart.type === 'powerbi' && !isHiddenPbiReportLoaded)}
            >
              {question}
              {isLoading && <span className="ml-2 animate-pulse">...</span>}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default Chart;