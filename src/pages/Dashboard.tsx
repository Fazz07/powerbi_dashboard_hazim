 import { useState, useEffect, useRef, useMemo, useCallback } from 'react'; // Added useCallback
 import { useNavigate } from 'react-router-dom';
 import Navbar from '@/components/Navbar';
 import EnhancedSidebar from '@/components/EnhancedSidebar';
 import PageSidebar from '@/components/PageSidebar';
 import ChatbotPanel from '@/components/ChatbotPanel';
 import DraggableChartGrid from '@/components/DraggableChartGrid';
 import { Layout as RGL_Layout } from 'react-grid-layout';
 import { mockCharts as initialMockCharts } from '@/data/mockCharts';
 import { ChartType, PowerBiConfig } from '@/types/chart';
 import { ChatMessage, ChatSuggestion } from '@/types/chat';
 import { useToast } from '@/hooks/use-toast';
 import { usePageManager } from '@/hooks/usePageManager';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
 import { fetchMainEmbedData, powerBiService, PowerBiEmbedData } from '@/services/powerBiUtils';
 import { ModalWindow, Report as ModalReport } from '@/components/ModalWindow';
 import { Button } from '@/components/ui/button';
 import * as pbi from 'powerbi-client';
 import NotificationPanel from '@/components/NotificationPanel';

 const API_BASE_URL = import.meta.env.VITE_YOUR_BACKEND_API_URL || 'http://localhost:3000';

 const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
   { question: 'How much amount did VanArsdel earn?' },
   { question: 'Highlight me the difference of returns between Sharepoint and Access.' },
   { question: 'What are the earnings of march 2019?' },
   { question: 'What is the net sales of Abbas?' },
 ];
 const DYNAMIC_PBI_CONFIG_MAP: Record<string, PowerBiConfig> = {
   "Category Breakdown": { pageName: "ReportSection998e2850a99cabad87e8", visualName: "3a28c5fee26bd29ff352" },
   "Revenue Trends": { pageName: "ReportSection998e2850a99cabad87e8", visualName: "d55aa7aa40745de10d55" },
   "Store Breakdown": { pageName: "ReportSection4b3fbaa7dd7908d906d9", visualName: "3a28c5fee26bd29ff352" },
 };

 const getAuthToken = (): string | null => {
   const userString = localStorage.getItem('user');
   if (!userString) {
     console.log("[getAuthToken] No 'user' item found in localStorage.");
     return null;
   }
   try {
     const parsedUser = JSON.parse(userString);
     if (parsedUser && typeof parsedUser === 'object' && 'id_token' in parsedUser) {
       if (parsedUser.id_token) {
         console.log("[getAuthToken] ID Token found in localStorage.");
         return parsedUser.id_token;
       } else {
         console.warn("[getAuthToken] 'user' object found but 'id_token' is empty or null. User data:", parsedUser);
         return null;
       }
     } else {
       console.warn("[getAuthToken] 'user' object in localStorage is not a valid object or does not contain 'id_token'. User data:", parsedUser);
       return null;
     }
   } catch (e) {
     console.error("[getAuthToken] Failed to parse 'user' from localStorage. Error:", e, "Raw data:", userString);
     return null;
   }
 };

 const mapChatHistoryToLLMFormat = (history: ChatMessage[]) => {
   return history.map(msg => ({
     role: msg.isUser ? 'user' : 'assistant',
     content: msg.message,
   })).filter(msg => msg.content.trim() !== '');
 };


 const Dashboard = () => {
   const [isEditMode, setIsEditMode] = useState(false);
   const [isChatOpen, setIsChatOpen] = useState(false);
   const [allCharts, setAllCharts] = useState<ChartType[]>([]);
   const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
   const [selectedChartForAI, setSelectedChartForAI] = useState<string | undefined>(undefined);

   // NEW STATE FOR CACHING PBI DATA
   const [cachedAllPbiChartData, setCachedAllPbiChartData] = useState<string | undefined>(undefined);
   const [isPbiDataCaching, setIsPbiDataCaching] = useState(false); // To indicate if data is currently being prepared
   const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

   const navigate = useNavigate();
   const { toast } = useToast();
   const {
     pages, currentPageId, setCurrentPageId, addPage, deletePage,
     updatePageCharts, updatePageLayout, currentPage
   } = usePageManager(setIsEditMode);

   const [mainEmbedData, setMainEmbedData] = useState<PowerBiEmbedData | null>(null);
   const [isAddPbiModalOpen, setIsAddPbiModalOpen] = useState(false);
   const isMounted = useRef(true);

   const hiddenPbiReportRef = useRef<HTMLDivElement>(null);
   const [hiddenPbiReportInstance, setHiddenPbiReportInstance] = useState<pbi.Report | null>(null);
   const [isHiddenPbiReportLoaded, setIsHiddenPbiReportLoaded] = useState(false);


   useEffect(() => {
     return () => {
       isMounted.current = false;
       if (hiddenPbiReportRef.current) {
           console.log("[Dashboard] Cleaning up hidden PBI report instance on unmount.");
           powerBiService.reset(hiddenPbiReportRef.current);
       }
     };
   }, []);

   useEffect(() => {
     console.log('[Dashboard] Auth effect running.');
     const user = localStorage.getItem('user');
     if (!user) {
       console.log('[Dashboard] No user found, navigating to /login.');
       navigate('/login');
     } else {
       console.log('[Dashboard] User found, fetching main PBI embed data.');
       fetchMainEmbedData()
         .then(data => {
           setMainEmbedData(data);
         })
         .catch(error => {
           console.error("[Dashboard] Failed to get PBI embed data:", error);
           toast({ title: "Power BI Error", description: "Could not load Power BI configuration.", variant: "destructive" });
         });
     }
   }, [navigate, toast]);

   // Effect: Embed the hidden Power BI report for data extraction
   useEffect(() => {
     if (!mainEmbedData || !hiddenPbiReportRef.current) {
       console.log('[Dashboard] Skipping hidden PBI report embed: Missing embedData or ref.');
       return;
     }

     const container = hiddenPbiReportRef.current;
     const { token, embedUrl, reportId } = mainEmbedData;

     console.log(`[Dashboard] Attempting to embed HIDDEN PBI report. ReportId: ${reportId}, EmbedUrl: ${embedUrl}`);

     powerBiService.reset(container);

     const reportConfig: pbi.IReportEmbedConfiguration = {
       type: 'report',
       accessToken: token,
       embedUrl: embedUrl,
       id: reportId,
       permissions: pbi.models.Permissions.Read,
       tokenType: pbi.models.TokenType.Embed,
       settings: {
         filterPaneEnabled: false,
         navContentPaneEnabled: false,
         layoutType: pbi.models.LayoutType.MobilePortrait,
         background: pbi.models.BackgroundType.Transparent,
       }
     };

     let report: pbi.Report | undefined;

     try {
       report = powerBiService.embed(container, reportConfig) as pbi.Report;
       setHiddenPbiReportInstance(report);

       report.off("loaded");
       report.off("error");
       report.off("rendered");

       report.on("loaded", () => {
         console.log(`[Dashboard] Hidden Power BI report loaded.`);
       });

       report.on("rendered", () => {
         console.log(`[Dashboard] Hidden Power BI report rendered.`);
         if (isMounted.current) {
           setIsHiddenPbiReportLoaded(true);
         }
       });

       report.on("error", (event) => {
         console.error(`[Dashboard] Hidden Power BI report error:`, event.detail);
         if (isMounted.current) {
           setIsHiddenPbiReportLoaded(false);
           toast({ title: "Power BI Data Error", description: "Failed to load hidden Power BI report for data extraction.", variant: "destructive", duration: 5000 });
         }
       });

     } catch (error) {
       console.error(`[Dashboard] Failed to embed hidden Power BI report:`, error);
       if (isMounted.current) {
         setIsHiddenPbiReportLoaded(false);
         toast({ title: "Power BI Data Embedding Failed", description: `Could not start hidden report embedding. Check console.`, variant: "destructive", duration: 5000 });
       }
     }

     return () => {
       setHiddenPbiReportInstance(null);
       setIsHiddenPbiReportLoaded(false);
       if (container) {
         powerBiService.reset(container);
       }
     };
   }, [mainEmbedData, toast]);


   const toggleNotificationPanel = () => { // +++ Function to toggle panel
     setIsNotificationPanelOpen(prev => !prev);
   };

   useEffect(() => {
     console.log('[Dashboard] Initializing allCharts from mockData.');
     const processedInitialCharts = initialMockCharts.map(chart => {
       if (chart.id === 'power-bi-report') {
         return { ...chart, id: 'power-bi-report-iframe', name: 'Power BI Report (Full Iframe)' };
       }
       return chart;
     });
     console.log('[Dashboard] Processed initial charts:', processedInitialCharts.map(c => ({id: c.id, type: c.type, name: c.name})));
     setAllCharts(processedInitialCharts);
   }, []);

   const visibleCharts = useMemo(() => {
     if (!currentPage) {
       console.log('[Dashboard] visibleCharts: currentPage is null/undefined.');
       return [];
     }
     const charts = allCharts.filter(chart => currentPage.charts.includes(chart.id));
     console.log(`[Dashboard] visibleCharts for page ${currentPage.id}:`, charts.map(c => ({id: c.id, type: c.type, name: c.name})));
     return charts;
   }, [allCharts, currentPage]);


   const toggleEditMode = () => {
       setIsEditMode(!isEditMode);
       if (isEditMode) {
           toast({ title: "Layout Saved", description: "Dashboard layout has been saved.", variant: "destructive" });
       }
   };

   const toggleChartVisibility = (chartId: string) => {
     console.log(`[Dashboard] toggleChartVisibility for ${chartId}`);
     const currentChartIds = currentPage?.charts || [];
     const chartMeta = allCharts.find(c => c.id === chartId);
     if (!chartMeta) return;

     if (currentChartIds.includes(chartId)) {
       updatePageCharts(currentPageId, currentChartIds.filter((id: string) => id !== chartId));
       toast({ title: "Chart Hidden", description: `${chartMeta.name} removed from this page.`, variant: "destructive" });
     } else {
       updatePageCharts(currentPageId, [...currentChartIds, chartId]);
       toast({ title: "Chart Added", description: `${chartMeta.name} added to this page.`, variant: "destructive" });
     }
   };
   const addChartToPage = (chartId: string) => {
     console.log(`[Dashboard] addChartToPage for ${chartId}`);
     const currentChartIds = currentPage?.charts || [];
       const chartMeta = allCharts.find(c => c.id === chartId);
       if (chartMeta && !currentChartIds.includes(chartId)) {
           updatePageCharts(currentPageId, [...currentChartIds, chartId]);
           toast({ title: "Chart Added", description: `${chartMeta.name} added to ${currentPage?.name}`, variant: "destructive" });
       }
   };
   const removeChartFromPage = (chartId: string) => {
     console.log(`[Dashboard] removeChartFromPage for ${chartId}`);
     const chartMeta = allCharts.find(c => c.id === chartId);
     updatePageCharts(currentPageId, (currentPage?.charts || []).filter((id: string) => id !== chartId));
     if (selectedChartForAI === chartMeta?.name) {
       setSelectedChartForAI(undefined);
     }
     toast({ title: "Chart Removed", description: `${chartMeta?.name || 'Chart'} removed from ${currentPage?.name}`, variant: "destructive" });
   };

   const handleLayoutChange = (newLayout: RGL_Layout[]) => {
     console.log('[Dashboard] handleLayoutChange:', newLayout);
     updatePageLayout(currentPageId, { lg: newLayout });
   };

   /**
    * NEW/REFACTORED FUNCTION: Internal helper to collect data from all visible Power BI visuals.
    * This function does not manage state or apply filters, just extracts data.
    */
   const _collectPbiVisualDataInternal = useCallback(async (): Promise<string | undefined> => {
     if (!hiddenPbiReportInstance || !isHiddenPbiReportLoaded) {
       console.warn("[Dashboard] Hidden Power BI report not ready for bulk data collection (internal).");
       return undefined;
     }

     const dataCollection: string[] = [];
     const allPages = await hiddenPbiReportInstance.getPages();

     const pbiChartsOnPage = visibleCharts.filter(chart => chart.type === 'powerbi' && chart.powerBiConfig);

     if (pbiChartsOnPage.length === 0) {
       console.log("[Dashboard] No Power BI charts found on the current page to collect data from (internal).");
       return undefined;
     }

     for (const chart of pbiChartsOnPage) {
       const { pageName, visualName } = chart.powerBiConfig!;
       try {
         const targetPage = allPages.find(p => p.name === pageName);

         if (!targetPage) {
           console.warn(`[Dashboard] Page '${pageName}' not found for chart '${chart.name}'. Skipping.`);
           continue;
         }

         await targetPage.setActive();
         console.log(`[Dashboard] Activated page '${pageName}' in hidden report for data extraction.`);

         const visualsOnPage = await targetPage.getVisuals();
         const targetVisual = visualsOnPage.find(v => v.name === visualName);

         if (!targetVisual) {
           console.warn(`[Dashboard] Visual '${visualName}' not found on page '${pageName}' for chart '${chart.name}'. Skipping.`);
           continue;
         }

         if (typeof (targetVisual as any).exportData === 'function') {
           const exportResult = await (targetVisual as any).exportData(pbi.models.ExportDataType.Summarized);
           if (exportResult && exportResult.data) {
             dataCollection.push(`--- Chart: ${chart.name} (Page: ${pageName}, Visual: ${visualName}) ---\n${exportResult.data}`);
             console.log(`[Dashboard] Successfully collected data for '${chart.name}'.`);
           } else {
             console.warn(`[Dashboard] No data returned for '${chart.name}' export.`);
           }
         } else {
           console.warn(`[Dashboard] exportData method not available for visual '${visualName}' on page '${pageName}'.`);
         }
       } catch (error: any) {
         console.error(`[Dashboard] Error collecting data from '${chart.name}':`, error);
         dataCollection.push(`--- Chart: ${chart.name} (Error) ---\nFailed to extract data: ${error.message || 'unknown error'}`);
       }
     }

     return dataCollection.length > 0 ? dataCollection.join('\n\n') : undefined;
   }, [hiddenPbiReportInstance, isHiddenPbiReportLoaded, visibleCharts]); // Dependencies for this internal helper


   // NEW EFFECT: Manages caching of Power BI data
   useEffect(() => {
     const updateDataCache = async () => {
       // Only proceed if hidden PBI report is loaded and there are Power BI charts on the current page
       if (isHiddenPbiReportLoaded && visibleCharts.some(chart => chart.type === 'powerbi')) {
         setIsPbiDataCaching(true);
         toast({ title: "Processing", description: "Preparing dashboard data for AI...", variant: "destructive", duration: 2000 });
         try {
           const data = await _collectPbiVisualDataInternal();
           setCachedAllPbiChartData(data);
           console.log("[Dashboard] Power BI chart data cache updated.");
           if (data) {
             toast({ title: "Successfull", description: "Dashboard data for AI is cached and ready.", variant: "destructive", duration: 2000 });
           } else {
             toast({ title: "No Data", description: "No Power BI data found for AI on this page.", variant: "destructive", duration: 2000 });
           }
         } catch (error) {
           console.error("[Dashboard] Error updating PBI data cache:", error);
           setCachedAllPbiChartData(undefined);
           toast({ title: "Data Caching Error", description: "Failed to cache dashboard data for AI.", variant: "destructive", duration: 3000 });
         } finally {
           setIsPbiDataCaching(false);
         }
       } else {
         // Clear cache if hidden report isn't loaded or no PBI charts are visible
         if (cachedAllPbiChartData !== undefined) {
            console.log("[Dashboard] Clearing Power BI chart data cache (conditions not met).");
            setCachedAllPbiChartData(undefined);
         }
         setIsPbiDataCaching(false); // Ensure loading state is off if conditions aren't met
       }
     };

     updateDataCache();
   }, [isHiddenPbiReportLoaded, currentPage, allCharts, _collectPbiVisualDataInternal, toast]); // Dependencies for re-caching: currentPage (changes when pageId or charts change), allCharts, hidden report status


   // Function to handle sending message and receiving streaming response
   const sendChatMessage = async (
     userInput: string,
     chartContentForDisplay: string | undefined, // Image data or text for display (for user message bubble)
     chartName?: string // Name of the specific chart, if applicable (for ChatbotPanel title)
   ) => {
     setIsChatOpen(true);
     setSelectedChartForAI(chartName);

     // Add user message to history
     setChatHistory(prev => [
       ...prev,
       { message: userInput, isUser: true, chartContent: chartContentForDisplay },
     ]);

     // Add placeholder AI message
     const aiMessageIndex = chatHistory.length + 1;
     setChatHistory(prev => [
       ...prev,
       { message: '', isUser: false, isLoading: true },
     ]);

     const authToken = getAuthToken();
     if (!authToken) {
       toast({ title: "Authentication Error", description: "Please log in to use AI assistant.", variant: "destructive" });
       setChatHistory(prev => prev.map((msg, idx) => idx === aiMessageIndex ? { ...msg, message: 'Authentication failed. Please log in.', isLoading: false } : msg));
       return;
     }

     // USE THE CACHED DATA HERE INSTEAD OF RE-COLLECTING
     const dataToSendToLLM = cachedAllPbiChartData || "No Power BI data available for analysis.";
     console.log("[Dashboard] Sending cached data to LLM:", dataToSendToLLM.substring(0, 200) + "..."); // Log first 200 chars

     try {
       const response = await fetch(`${API_BASE_URL}/llm-response`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${authToken}`
         },
         body: JSON.stringify({
           userInput: userInput,
           data: dataToSendToLLM, // Use the cached data
           messages: mapChatHistoryToLLMFormat(chatHistory),
         }),
       });

       if (!response.ok) {
         const errorBody = await response.json();
         console.error("LLM API error:", errorBody);
         toast({ title: "AI Error", description: `Failed to get AI response: ${errorBody.details || errorBody.message || response.statusText}`, variant: "destructive" });
         setChatHistory(prev => prev.map((msg, idx) => idx === aiMessageIndex ? { ...msg, message: `Error: ${errorBody.details || 'Failed to get response.'}`, isLoading: false } : msg));
         return;
       }

       if (!response.body) {
         console.warn("LLM API returned no body.");
         setChatHistory(prev => prev.map((msg, idx) => idx === aiMessageIndex ? { ...msg, message: 'No response from AI.', isLoading: false } : msg));
         return;
       }

       const reader = response.body.getReader();
       const decoder = new TextDecoder('utf-8');
       let accumulatedContent = '';

       while (true) {
         const { done, value } = await reader.read();
         if (done) {
           console.log('Stream complete');
           break;
         }
         const chunk = decoder.decode(value, { stream: true });
         chunk.split('\n').forEach(line => {
           if (line.startsWith('data: ')) {
             try {
               const jsonString = line.substring(6);
               if (jsonString === '[DONE]') {
                   console.log('OpenAI stream DONE.');
                   return;
               }
               const parsed = JSON.parse(jsonString);
               const content = parsed.choices?.[0]?.delta?.content;
               if (content) {
                 accumulatedContent += content;
                 setChatHistory(prev => prev.map((msg, idx) => idx === aiMessageIndex ? { ...msg, message: accumulatedContent, isLoading: true } : msg));
               }
             } catch (parseError) {
               console.warn("Failed to parse SSE data chunk:", parseError, "Chunk:", line);
             }
           }
         });
       }

       setChatHistory(prev => prev.map((msg, idx) => idx === aiMessageIndex ? { ...msg, isLoading: false } : msg));

     } catch (error) {
       console.error("Fetch or stream error:", error);
       toast({ title: "Network Error", description: "Could not connect to AI service.", variant: "destructive" });
       setChatHistory(prev => prev.map((msg, idx) => idx === aiMessageIndex ? { ...msg, message: 'Network error or AI service unreachable.', isLoading: false } : msg));
     }
   };

   // MODIFIED: handleSendMessageToAI now uses cached data
   const handleSendMessageToAI = async (message: string) => {
     if (isPbiDataCaching) {
       toast({ title: "Please Wait", description: "Dashboard data is currently being prepared for AI. Try again shortly.", variant: "destructive", duration: 3000 });
       return;
     }
     const displayContent = cachedAllPbiChartData ? "Data from all visible charts sent to AI." : "No Power BI data sent to AI.";
     sendChatMessage(message, displayContent, "All Visible Charts");
   };

   // MODIFIED: handleTriggerAIQueryFromChartButton now uses cached data
   const handleTriggerAIQueryFromChartButton = async (question: string, chartId: string) => {
     if (isPbiDataCaching) {
       toast({ title: "Please Wait", description: "Dashboard data is currently being prepared for AI. Try again shortly.", variant: "destructive", duration: 3000 });
       return;
     }
     setIsChatOpen(true);
     const chartMeta = allCharts.find(c => c.id === chartId);
     setSelectedChartForAI(chartMeta?.name);

     const displayContent = cachedAllPbiChartData ? "Query based on all visible dashboard data." : "No Power BI data could be extracted for AI.";

     sendChatMessage(question, displayContent, chartMeta?.name);
   };

   const handleAddDynamicPbiReports = (reportsFromModal: ModalReport[]) => {
     console.log('[Dashboard] handleAddDynamicPbiReports called with:', reportsFromModal);
     const newPbiCharts: ChartType[] = [];
     const newChartIdsForPage: string[] = [];

     reportsFromModal.forEach(modalReport => {
       const dynamicChartId = `dynamic-pbi-${modalReport.id}`;
       console.log(`[Dashboard] Processing modal report: ${modalReport.title}, target ID: ${dynamicChartId}`);

       if (allCharts.some(c => c.id === dynamicChartId)) {
         console.log(`[Dashboard] Chart ${dynamicChartId} already in allCharts.`);
         if (!currentPage?.charts.includes(dynamicChartId)) {
             newChartIdsForPage.push(dynamicChartId);
             console.log(`[Dashboard] Adding existing chart ${dynamicChartId} to current page.`);
         }
         return;
       }

       const pbiConfig = DYNAMIC_PBI_CONFIG_MAP[modalReport.title] || DYNAMIC_PBI_CONFIG_MAP[String(modalReport.id)];
       if (!pbiConfig) {
         console.warn(`[Dashboard] No PBI config found for "${modalReport.title}". Cannot add.`);
         toast({ title: "Config Missing", description: `No Power BI config found for "${modalReport.title}". Cannot add.`, variant: "destructive" });
         return;
       }
       console.log(`[Dashboard] Found PBI config for ${modalReport.title}:`, pbiConfig);

       const newChart: ChartType = {
         id: dynamicChartId,
         name: modalReport.title,
         type: 'powerbi',
         content: modalReport.description || `Dynamically added Power BI visual: ${modalReport.title}`,
         icon: <span className="text-purple-500">💠</span>,
         layout: {
           i: dynamicChartId,
           x: ( (currentPage?.charts.length || 0) * 6 ) % 12,
           y: Infinity,
           w: 6, h: 10, minW: 3, minH: 6
         },
         askableQuestions: [
           `Summarize ${modalReport.title}`,
           `What are the key trends in ${modalReport.title}?`
         ],
         isDynamicPBI: true,
       };
       console.log(`[Dashboard] Created new PBI chart object:`, newChart);
       newPbiCharts.push(newChart);
       newChartIdsForPage.push(newChart.id);
     });

     if (newPbiCharts.length > 0) {
       console.log('[Dashboard] Adding new PBI charts to allCharts state:', newPbiCharts);
       setAllCharts(prevAll => [...prevAll, ...newPbiCharts]);
     }
     if (newChartIdsForPage.length > 0) {
       console.log('[Dashboard] Adding new chart IDs to current page:', newChartIdsForPage);
       updatePageCharts(currentPageId, [...(currentPage?.charts || []), ...newChartIdsForPage]);
       toast({ title: "Reports Added", description: `${newChartIdsForPage.length} Power BI visual(s) added.`, variant: "destructive" });
     }
     setIsAddPbiModalOpen(false);
   };


   return (
     <SidebarProvider>
       <div className="flex h-screen w-full overflow-hidden bg-background"> {/* Changed bg-gray-50 dark:bg-gray-900 to bg-background */}
         <PageSidebar
           pages={pages}
           currentPageId={currentPageId}
           onPageChange={(pageId) => { console.log(`[Dashboard] Page changed to: ${pageId}`); setCurrentPageId(pageId);}}
           onAddPage={addPage}
           onDeletePage={deletePage}
           isEditMode={isEditMode}
         />

         <SidebarInset className="flex flex-col">
           <Navbar
            onToggleEditMode={toggleEditMode}
            isEditMode={isEditMode}
            onToggleNotificationPanel={toggleNotificationPanel} // +++ Pass toggle function
           />

           <div className="flex flex-1 overflow-hidden">
             <EnhancedSidebar
               availableCharts={allCharts}
               pageChartIds={currentPage?.charts || []}
               onToggleChart={toggleChartVisibility}
               onAddChart={addChartToPage}
               isEditMode={isEditMode}
               isCurrentPageDefault={currentPage?.isDefault || false}
             />

             <main className="flex-1 overflow-hidden relative bg-background"> {/* Changed bg-gray-50 dark:bg-gray-800 to bg-background */}
               <ScrollArea className="h-full w-full">
                 <div className="p-4 md:p-6">
                     {isEditMode && !currentPage?.isDefault && (
                         <div className="mb-4 text-right">
                             <Button onClick={() => setIsAddPbiModalOpen(true)} className="rounded-md">Add Power BI Visual</Button> {/* Added rounded-md */}
                         </div>
                     )}

                   {visibleCharts.length > 0 ? (
                     <DraggableChartGrid
                       charts={visibleCharts}
                       isEditMode={isEditMode}
                       onRemoveChart={removeChartFromPage}
                       onLayoutChange={handleLayoutChange}
                       onAskQuestion={handleTriggerAIQueryFromChartButton}
                       pageId={currentPageId}
                       savedLayout={currentPage?.layout}
                       mainEmbedData={mainEmbedData}
                       hiddenPbiReportInstance={hiddenPbiReportInstance}
                       isHiddenPbiReportLoaded={isHiddenPbiReportLoaded}
                       isDataLoading={isPbiDataCaching}
                     />
                   ) : (
                     <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                       <div className="text-center space-y-4 p-8">
                         <div className="text-6xl opacity-20">📊</div>
                         <h3 className="text-2xl font-semibold text-foreground"> {/* Changed text-gray-600 dark:text-gray-300 to text-foreground */}
                           {currentPage?.name} is Empty
                         </h3>
                         <p className="text-muted-foreground max-w-md"> {/* Changed text-gray-500 dark:text-gray-400 to text-muted-foreground */}
                           {isEditMode && !currentPage?.isDefault
                             ? "Select charts from the sidebar or 'Add Power BI Visual' to customize this page."
                             : "Switch to 'Edit Mode' (top right) to add visuals to this page."
                           }
                           {isEditMode && currentPage?.isDefault && (
                              "You can rearrange existing charts in edit mode, but cannot add/remove visuals on default pages."
                           )}
                           {!isEditMode && currentPage?.isDefault && (
                             "This is a default page. Switch to 'Edit Mode' (top right) to rearrange existing visuals."
                           )}
                         </p>
                       </div>
                     </div>
                   )}
                 </div>
               </ScrollArea>
             </main>

             <ChatbotPanel
               isOpen={isChatOpen}
               onToggle={() => setIsChatOpen(!isChatOpen)}
               chatHistory={chatHistory}
               onSendMessage={handleSendMessageToAI}
               suggestions={DEFAULT_SUGGESTIONS}
               selectedChart={selectedChartForAI}
               isDataLoading={isPbiDataCaching}
             />
           </div>
         </SidebarInset>
       </div>
       <ModalWindow
         isOpen={isAddPbiModalOpen}
         onClose={() => setIsAddPbiModalOpen(false)}
         onAdd={handleAddDynamicPbiReports}
       />

       <NotificationPanel
         isOpen={isNotificationPanelOpen}
         onClose={() => setIsNotificationPanelOpen(false)}
       />

       {/* Hidden div for embedding the full Power BI report for data extraction */}
       <div ref={hiddenPbiReportRef} style={{ width: '0px', height: '0px', overflow: 'hidden', position: 'absolute', left: '-9999px' }}></div>
     </SidebarProvider>
   );
 };

 export default Dashboard;