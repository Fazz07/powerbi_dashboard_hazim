// src/components/Chart.tsx
// src/components/ChatbotPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
 import { Card } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { ChartType } from '@/types/chart';
 import { X, Loader2 } from 'lucide-react';
 import { svgToDataUrl } from '@/utils/svgUtils';
 import { captureIframeAsImage } from '@/utils/iframeUtils'; // Not used in current render path for PBI
 import { useToast } from '@/hooks/use-toast';
 import * as pbi from 'powerbi-client';
 import { powerBiService, PowerBiEmbedData } from '@/services/powerBiUtils';
 import { parseData } from '@/utils/dataParsing'; // Not used in current render path

 interface ChartProps {
   chart: ChartType;
   isEditMode: boolean;
   onRemove: (id: string) => void;
   onAskQuestion: (question: string, chartId: string) => void;
   mainEmbedData: PowerBiEmbedData | null;
   currentFilters: pbi.models.IFilter[];
   onVisualDataSelected: (chartId: string, filters: pbi.models.IFilter[]) => void;
   hiddenPbiReportInstance: pbi.Report | null;
   isHiddenPbiReportLoaded: boolean;
   isDataLoading?: boolean; // NEW: Added prop
 }

 const Chart = ({
   chart,
   isEditMode,
   onRemove,
   onAskQuestion,
   mainEmbedData,
   currentFilters,
   onVisualDataSelected,
   hiddenPbiReportInstance,
   isHiddenPbiReportLoaded,
   isDataLoading // Destructure new prop
 }: ChartProps) => {
   const { toast } = useToast();
   const [pbiLoading, setPbiLoading] = useState(true);
   const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
   const chartRef = useRef<HTMLDivElement>(null);
   const pbiContainerRef = useRef<HTMLDivElement>(null);
   const isMounted = useRef(true);
   const [pbiVisual, setPbiVisual] = useState<pbi.Visual | null>(null);

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
       type: 'visual',
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
     console.log(`[Chart-${chart.id}] Triggering global AI query for all charts for question: "${question}"`);
     onAskQuestion(question, chart.id);
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
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm z-10 rounded-xl">
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
         className="w-full h-full border-none rounded-b-xl"
         allowFullScreen
       />
     );
   } else {
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
     <Card ref={chartRef} className="overflow-hidden relative flex flex-col h-full rounded-xl shadow-md border-border">
       {isEditMode && chart.type !== 'powerbi' && (
         <Button
           variant="destructive"
           size="icon"
           className="absolute top-2 right-2 z-10 chart-delete-button rounded-full w-7 h-7"
           onClick={handleDeleteClick}
           onMouseDown={(e) => e.stopPropagation()}
           onTouchStart={(e) => e.stopPropagation()}
           aria-label="Remove chart"
         >
           <X className="h-4 w-4" />
         </Button>
       )}

       <div className="bg-[#2b3b5b] p-4 border-b border-border bg-card rounded-t-xl">
         <h3 className="text-lg font-semibold text-white">{chart.name}</h3>
       </div>

       <div
         className="flex-1 bg-background relative flex items-center justify-center"
         id={`chart-content-wrapper-${chart.id}`}
       >
         {actualChartContent}
       </div>

       <div className="p-4 bg-muted/20 border-t border-border rounded-b-xl">
         <h4 className="text-sm font-semibold mb-2 text-foreground">Ask AI about this chart:</h4>
         <div className="grid grid-cols-1 gap-2">
           {(chart.askableQuestions || []).map((question, idx) => (
             <Button
               key={idx}
               variant="secondary"
               size="sm"
               className="text-left justify-start text-xs rounded-md h-auto py-2"
               onClick={() => handleAskQuestion(question)}
               // NEW: Disable button if Power BI visual is loading or global data caching is in progress
               disabled={pbiLoading || (chart.type === 'powerbi' && !isHiddenPbiReportLoaded) || isDataLoading}
             >
               {question}
             </Button>
           ))}
         </div>
       </div>
     </Card>
   );
 };

 export default Chart;