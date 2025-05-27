// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import EnhancedSidebar from '@/components/EnhancedSidebar'; // Chart Library
import PageSidebar from '@/components/PageSidebar'; // For dashboard pages
import ChatbotPanel from '@/components/ChatbotPanel';
import DraggableChartGrid from '@/components/DraggableChartGrid';
import { Layout as RGL_Layout } from 'react-grid-layout'; // Renamed to avoid conflict
import { mockCharts as initialMockCharts } from '@/data/mockCharts';
import { ChartType, PowerBiConfig } from '@/types/chart';
import { ChatMessage, ChatSuggestion } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { usePageManager } from '@/hooks/usePageManager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import * as pbi from 'powerbi-client';
import { powerBiService, fetchMainEmbedData, PowerBiEmbedData } from '@/services/powerBiUtils'; // Updated import

// Import a Modal for adding dynamic PBI reports (similar to friend's)
import { ModalWindow, Report as ModalReport } from '@/components/ModalWindow'; // Ensure this file exists and is exported correctly

// Add Button import (adjust path as needed for your UI library)
import { Button } from '@/components/ui/button';

const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
  { question: "What insights can I get from these charts?" },
  // ...
];

// Mapping from ModalReport.title (or id) to PowerBiConfig
// THIS IS CRUCIAL and needs to match your PBI report structure.
const DYNAMIC_PBI_CONFIG_MAP: Record<string, PowerBiConfig> = {
  "Category Breakdown": { pageName: "ReportSection998e2850a99cabad87e8", visualName: "3a28c5fee26bd29ff352" },
  "Revenue Trends": { pageName: "ReportSection998e2850a99cabad87e8", visualName: "d55aa7aa40745de10d55" },
  "Store Breakdown": { pageName: "ReportSection4b3fbaa7dd7908d906d9", visualName: "3a28c5fee26bd29ff352" },
  // Add more mappings for all reports selectable in ModalWindow
};


const Dashboard = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [allCharts, setAllCharts] = useState<ChartType[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedChartForAI, setSelectedChartForAI] = useState<string | undefined>(undefined);

  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    pages, currentPageId, setCurrentPageId, addPage, deletePage,
    updatePageCharts, updatePageLayout, getCurrentPage
  } = usePageManager();

  // Power BI State
  const [mainEmbedData, setMainEmbedData] = useState<PowerBiEmbedData | null>(null);
  const pbiEmbedsRef = useRef<Map<string, pbi.Embed>>(new Map());
  const pbiContainerRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [pbiVisualLoadingState, setPbiVisualLoadingState] = useState<Record<string, boolean>>({}); // chartId: isLoading

  // Modal state for adding dynamic PBI reports
  const [isAddPbiModalOpen, setIsAddPbiModalOpen] = useState(false);

  // --- AUTHENTICATION (Mocked - real app would use an auth service) ---
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
    } else {
      // Fetch Power BI embed configuration once authenticated
      fetchMainEmbedData()
        .then(data => setMainEmbedData(data))
        .catch(error => {
          console.error("Dashboard: Failed to get PBI embed data", error);
          toast({ title: "Power BI Error", description: "Could not load Power BI configuration.", variant: "destructive" });
        });
    }
  }, [navigate, toast]);


  // Initialize allCharts from mockData (or potentially from a backend in a real app)
  useEffect(() => {
    // Ensure the Power BI iframe chart from original mockCharts is handled or updated
    // For this example, we'll assume initialMockCharts is now correctly typed
    // and contains definitions for static PBI visuals.
    const processedInitialCharts = initialMockCharts.map(chart => {
      if (chart.id === 'power-bi-report') { // Assuming this was your old iframe PBI
        return { ...chart, id: 'power-bi-report-iframe', name: 'Power BI Report (Full Iframe)' };
      }
      return chart;
    });
    setAllCharts(processedInitialCharts);
  }, []);


  const currentPage = getCurrentPage();
  const visibleCharts = useMemo(() => {
    return allCharts.filter(chart => currentPage?.charts.includes(chart.id));
  }, [allCharts, currentPage]);


  // Callback to attach/detach PBI container refs
  // Change signature to (ref: HTMLDivElement, chartId: string) => void
  const handlePbiContainerRefChange = useCallback((ref: HTMLDivElement, chartId: string) => {
    if (ref) {
      pbiContainerRefs.current.set(chartId, ref);
    } else {
      pbiContainerRefs.current.delete(chartId);
    }
    // Trigger re-evaluation of embedding effect if needed, by possibly changing a state if this direct ref update isn't enough.
    // For now, the embedding effect depends on visibleCharts and mainEmbedData.
  }, []);


  // --- POWER BI EMBEDDING LOGIC ---
  useEffect(() => {
    if (!mainEmbedData || visibleCharts.length === 0) {
      // console.log("PBI Embed: Waiting - mainEmbedData:", !!mainEmbedData, "visibleCharts:", visibleCharts.length);
      return; // Not ready to embed
    }
    // console.log("PBI Embed: Main Embed Data available:", mainEmbedData);

    visibleCharts.forEach(chart => {
      if (chart.type === 'powerbi' && chart.powerBiConfig) {
        const container = pbiContainerRefs.current.get(chart.id);
        const existingEmbed = pbiEmbedsRef.current.get(chart.id);

        if (container && !existingEmbed) {
          // console.log(`PBI Embed: Attempting to embed ${chart.id} into container:`, container);
          setPbiVisualLoadingState(prev => ({ ...prev, [chart.id]: true }));
          container.innerHTML = ''; // Clear previous content

          const embedConfig: pbi.IVisualEmbedConfiguration = {
            type: 'visual',
            accessToken: mainEmbedData.token, // Use token from mainEmbedData
            embedUrl: mainEmbedData.embedUrl, // Use main report embedUrl from mainEmbedData
            id: mainEmbedData.reportId,       // Use main reportId from mainEmbedData
            pageName: chart.powerBiConfig.pageName,     // Specific to this visual
            visualName: chart.powerBiConfig.visualName, // Specific to this visual
            permissions: pbi.models.Permissions.Read,
            tokenType: pbi.models.TokenType.Embed,
            settings: {
              filterPaneEnabled: false,
              navContentPaneEnabled: false,
            }
          };
          // console.log(`PBI Embed: Config for ${chart.id}:`, embedConfig);

          try {
            const visual = powerBiService.embed(container, embedConfig);
            pbiEmbedsRef.current.set(chart.id, visual);

            visual.on('loaded', () => {
              // console.log(`PBI Visual Loaded: ${chart.name} (${chart.id})`);
              // No change needed here for event handlers
            });

            visual.on('rendered', () => {
              // console.log(`PBI Visual Rendered: ${chart.name} (${chart.id})`);
              setPbiVisualLoadingState(prev => ({ ...prev, [chart.id]: false }));
            });

            visual.on('dataSelected', (event) => {
              // console.log(`Data selected on PBI visual ${chart.name}:`, event.detail);
              toast({ title: "Data Selected", description: `Selection on ${chart.name}`});
            });

            visual.on('error', (event: any) => { // Use any for event if type is complex
              console.error(`PBI Visual Error (${chart.name} - ${chart.id}):`, event.detail);
              setPbiVisualLoadingState(prev => ({ ...prev, [chart.id]: false }));
              if (container) {
                  container.innerHTML = `<div class="p-4 text-red-500 text-center">Error loading Power BI visual: ${chart.name}. <pre>${JSON.stringify(event.detail, null, 2)}</pre></div>`;
              }
              toast({ title: `PBI Error: ${chart.name}`, description: `Could not load visual. Details: ${event.detail?.message || 'Unknown error'}`, variant: "destructive", duration: 10000 });
            });

          } catch (error) {
            console.error(`Error initiating PBI embed for ${chart.name} (${chart.id}):`, error);
            setPbiVisualLoadingState(prev => ({ ...prev, [chart.id]: false }));
             if (container) {
                container.innerHTML = `<div class="p-4 text-red-500 text-center">Failed to embed: ${chart.name}. Check console.</div>`;
            }
          }
        } else if (container && existingEmbed) {
          // console.log(`PBI Embed: Visual ${chart.id} already embedded.`);
        } else if (!container) {
          // console.warn(`PBI Embed: Container for ${chart.id} not found yet.`);
        }
      }
    });

    // Cleanup embeds for charts that are no longer visible (same as before)
    const currentVisiblePbiIds = new Set(visibleCharts.filter(c => c.type === 'powerbi').map(c => c.id));
    pbiEmbedsRef.current.forEach((embed, chartId) => {
      if (!currentVisiblePbiIds.has(chartId)) {
        const container = pbiContainerRefs.current.get(chartId);
        if (container && pbiEmbedsRef.current.has(chartId)) { // Check if embed actually exists
          try {
            // console.log(`PBI Embed: Attempting to reset/clean PBI Visual: ${chartId}`);
            powerBiService.reset(container); // Resets the container, removing the iframe
            // console.log(`PBI Embed: PBI Visual Reset/Cleaned: ${chartId}`);
          } catch (error) {
            // console.error(`PBI Embed: Error resetting PBI container for ${chartId}:`, error);
             // If reset fails, manually clear container to prevent stale content
            if (container.firstChild) { // Check if there's an iframe
                // container.innerHTML = ''; // More aggressive cleanup
            }
          }
        }
        pbiEmbedsRef.current.delete(chartId);
        pbiContainerRefs.current.delete(chartId);
        setPbiVisualLoadingState(prev => {
            const newState = {...prev};
            delete newState[chartId];
            return newState;
        });
      }
    });

  }, [visibleCharts, mainEmbedData, toast]); // Dependencies are correct


  // --- UI Handlers ---
  const toggleEditMode = () => {
    if (isEditMode) {
      toast({ title: "Layout saved", description: "Dashboard layout changes applied." });
      // If using backend persistence for layout, API call would go here.
      // For usePageManager, it saves to localStorage automatically on layout change.
    }
    setIsEditMode(!isEditMode);
  };

  const toggleChartVisibility = (chartId: string) => { // Renamed for clarity
    const currentChartIds = currentPage?.charts || [];
    const chartMeta = allCharts.find(c => c.id === chartId);
    if (!chartMeta) return;

    if (currentChartIds.includes(chartId)) {
      updatePageCharts(currentPageId, currentChartIds.filter(id => id !== chartId));
      toast({ title: "Chart Hidden", description: `${chartMeta.name} removed from this page.` });
    } else {
      updatePageCharts(currentPageId, [...currentChartIds, chartId]);
      toast({ title: "Chart Added", description: `${chartMeta.name} added to this page.` });
    }
  };
  
  const addChartToPage = (chartId: string) => { // For adding from library
      const currentChartIds = currentPage?.charts || [];
      const chartMeta = allCharts.find(c => c.id === chartId);
      if (chartMeta && !currentChartIds.includes(chartId)) {
          updatePageCharts(currentPageId, [...currentChartIds, chartId]);
          toast({ title: "Chart Added", description: `${chartMeta.name} added to ${currentPage?.name}` });
      }
  };

  const removeChartFromPage = (chartId: string) => { // For removing via X button on chart
    const chartMeta = allCharts.find(c => c.id === chartId);
    updatePageCharts(currentPageId, (currentPage?.charts || []).filter(id => id !== chartId));
    if (selectedChartForAI === chartMeta?.name) {
      setSelectedChartForAI(undefined);
    }
    toast({ title: "Chart Removed", description: `${chartMeta?.name || 'Chart'} removed from ${currentPage?.name}` });
  };

  const handleLayoutChange = (newLayout: RGL_Layout[]) => {
    updatePageLayout(currentPageId, { lg: newLayout }); // react-grid-layout usually uses 'lg' breakpoint by default
  };


  // --- AI Chat Interaction ---
  const handleSendMessageToAI = (message: string) => { // Renamed
    // ... (Your existing AI message sending logic) ...
    setChatHistory(prev => [...prev, { message, isUser: true }]);
    setTimeout(() => {
      setChatHistory(prev => [...prev, { message: "AI: I'm thinking...", isUser: false }]);
    }, 1000);
  };

  const handleAskQuestionAboutChart = (question: string, chartId: string, chartContent?: string) => { // Renamed
    const chart = allCharts.find(c => c.id === chartId);
    setSelectedChartForAI(chart?.name);
    
    let contentForMessage = chartContent;
    if (chart?.type === 'powerbi') {
        contentForMessage = `(Reference to Power BI Visual: ${chart.name})`;
    }

    setChatHistory(prev => [
      ...prev, 
      { message: question, isUser: true, chartContent: contentForMessage }
    ]);
    setIsChatOpen(true);
    // ... (Your existing AI response logic based on chartId/question) ...
    setTimeout(() => {
      setChatHistory(prev => [...prev, { message: `AI response about ${chart?.name || 'chart'}...`, isUser: false }]);
    }, 1500);
  };

  // --- Dynamic PBI Report Addition ---
  const handleAddDynamicPbiReports = (reportsFromModal: ModalReport[]) => {
    const newPbiCharts: ChartType[] = [];
    const newChartIdsForPage: string[] = [];

    reportsFromModal.forEach(modalReport => {
      const dynamicChartId = `dynamic-pbi-${modalReport.id}`;
      
      // Check if already exists in allCharts
      if (allCharts.some(c => c.id === dynamicChartId)) {
        // If it exists but not on current page, just add its ID
        if (!currentPage?.charts.includes(dynamicChartId)) {
            newChartIdsForPage.push(dynamicChartId);
        }
        return; // Skip creating new ChartType object
      }

      const pbiConfig = DYNAMIC_PBI_CONFIG_MAP[modalReport.title] || DYNAMIC_PBI_CONFIG_MAP[String(modalReport.id)];
      if (!pbiConfig) {
        toast({ title: "Config Missing", description: `No Power BI config found for "${modalReport.title}". Cannot add.`, variant: "destructive" });
        return;
      }

      const newChart: ChartType = {
        id: dynamicChartId,
        name: modalReport.title,
        type: 'powerbi',
        content: modalReport.description || `Dynamically added Power BI visual: ${modalReport.title}`,
        icon: <span className="text-purple-500">💠</span>, // Placeholder icon for dynamic PBI
        powerBiConfig: pbiConfig,
        layout: { // Define a default layout or calculate next available spot
          i: dynamicChartId,
          x: ( (currentPage?.charts.length || 0) * 4 ) % 12, // Basic positioning
          y: Infinity, // Puts it at the bottom
          w: 4, h: 10, minW: 2, minH: 8
        },
        askableQuestions: [
          `Summarize ${modalReport.title}`,
          `What are the key trends in ${modalReport.title}?`
        ],
        isDynamicPBI: true,
      };
      newPbiCharts.push(newChart);
      newChartIdsForPage.push(newChart.id);
    });

    if (newPbiCharts.length > 0) {
      setAllCharts(prevAll => [...prevAll, ...newPbiCharts]);
    }
    if (newChartIdsForPage.length > 0) {
      updatePageCharts(currentPageId, [...(currentPage?.charts || []), ...newChartIdsForPage]);
      toast({ title: "Reports Added", description: `${newChartIdsForPage.length} Power BI visual(s) added.` });
    }
    setIsAddPbiModalOpen(false);
  };


  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
        <PageSidebar
          pages={pages}
          currentPageId={currentPageId}
          onPageChange={setCurrentPageId}
          onAddPage={addPage}
          onDeletePage={deletePage}
          isEditMode={isEditMode}
        />
        
        <SidebarInset className="flex flex-col">
          <Navbar onToggleEditMode={toggleEditMode} isEditMode={isEditMode} />
          
          <div className="flex flex-1 overflow-hidden">
            <EnhancedSidebar 
              availableCharts={allCharts}
              pageChartIds={currentPage?.charts || []}
              onToggleChart={toggleChartVisibility} // Use renamed handler
              onAddChart={addChartToPage} // Use renamed handler
              isEditMode={isEditMode}
            />
            
            <main className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-gray-800">
              <ScrollArea className="h-full w-full">
                <div className="p-4 md:p-6">
                    {/* Button to open Add PBI Modal */}
                    {isEditMode && (
                        <div className="mb-4 text-right">
                            <Button onClick={() => setIsAddPbiModalOpen(true)}>Add Power BI Visual</Button>
                        </div>
                    )}

                  {visibleCharts.length > 0 ? (
                    <DraggableChartGrid
                      charts={visibleCharts}
                      isEditMode={isEditMode}
                      onRemoveChart={removeChartFromPage} // Use renamed handler
                      onLayoutChange={handleLayoutChange}
                      onAskQuestion={handleAskQuestionAboutChart} // Use renamed handler
                      pageId={currentPageId}
                      savedLayout={currentPage?.layout}
                      // Pass down the ref handler and loading states
                      onPbiContainerRefChange={handlePbiContainerRefChange} // Signature now matches expected
                      pbiVisualLoadingStates={pbiVisualLoadingState}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[calc(100vh-10rem)]"> {/* Adjusted height */}
                      <div className="text-center space-y-4 p-8">
                        <div className="text-6xl opacity-20">📊</div>
                        <h3 className="text-2xl font-semibold text-gray-600 dark:text-gray-300">
                          {currentPage?.name} is Empty
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md">
                          {isEditMode 
                            ? "Add charts from the library or 'Add Power BI Visual' to customize this page."
                            : "Switch to edit mode to add visuals to this page."
                          }
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
              onSendMessage={handleSendMessageToAI} // Use renamed handler
              suggestions={DEFAULT_SUGGESTIONS} // Or make suggestions dynamic
              selectedChart={selectedChartForAI}
            />
          </div>
        </SidebarInset>
      </div>
      <ModalWindow
        isOpen={isAddPbiModalOpen}
        onClose={() => setIsAddPbiModalOpen(false)}
        onAdd={handleAddDynamicPbiReports}
      />
    </SidebarProvider>
  );
};

export default Dashboard;