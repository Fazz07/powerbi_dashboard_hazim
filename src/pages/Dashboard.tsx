// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo, } from 'react';
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
import { fetchMainEmbedData, PowerBiEmbedData } from '@/services/powerBiUtils';
import { ModalWindow, Report as ModalReport } from '@/components/ModalWindow';
import { Button } from '@/components/ui/button';

const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [ /* ... */ ];
const DYNAMIC_PBI_CONFIG_MAP: Record<string, PowerBiConfig> = {
  "Category Breakdown": { pageName: "ReportSection998e2850a99cabad87e8", visualName: "3a28c5fee26bd29ff352" },
  "Revenue Trends": { pageName: "ReportSection998e2850a99cabad87e8", visualName: "d55aa7aa40745de10d55" },
  "Store Breakdown": { pageName: "ReportSection4b3fbaa7dd7908d906d9", visualName: "3a28c5fee26bd29ff352" },
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
    updatePageCharts, updatePageLayout, currentPage // Now currentPage is also exported and memoized
  } = usePageManager(setIsEditMode);

  const [mainEmbedData, setMainEmbedData] = useState<PowerBiEmbedData | null>(null);
  const [isAddPbiModalOpen, setIsAddPbiModalOpen] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
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

  // currentPage is now memoized and comes directly from usePageManager
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
          toast({ title: "Layout Saved", description: "Dashboard layout has been saved." });
      }
  };

  const toggleChartVisibility = (chartId: string) => {
    console.log(`[Dashboard] toggleChartVisibility for ${chartId}`);
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
  const addChartToPage = (chartId: string) => {
    console.log(`[Dashboard] addChartToPage for ${chartId}`);
    const currentChartIds = currentPage?.charts || [];
      const chartMeta = allCharts.find(c => c.id === chartId);
      if (chartMeta && !currentChartIds.includes(chartId)) {
          updatePageCharts(currentPageId, [...currentChartIds, chartId]);
          toast({ title: "Chart Added", description: `${chartMeta.name} added to ${currentPage?.name}` });
      }
  };
  const removeChartFromPage = (chartId: string) => {
    console.log(`[Dashboard] removeChartFromPage for ${chartId}`);
    const chartMeta = allCharts.find(c => c.id === chartId);
    updatePageCharts(currentPageId, (currentPage?.charts || []).filter(id => id !== chartId));
    if (selectedChartForAI === chartMeta?.name) {
      setSelectedChartForAI(undefined);
    }
    toast({ title: "Chart Removed", description: `${chartMeta?.name || 'Chart'} removed from ${currentPage?.name}` });
  };

  const handleLayoutChange = useCallback((newLayout: RGL_Layout[]) => {
    console.log('[Dashboard] handleLayoutChange:', newLayout);
    updatePageLayout(currentPageId, { lg: newLayout });
  }, [currentPageId, updatePageLayout]); // Add updatePageLayout to dependencies

  const handleSendMessageToAI = (message: string) => { /* ... as before ... */ };
  const handleAskQuestionAboutChart = (question: string, chartId: string, chartContent?: string) => { /* ... as before ... */ };
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
          x: ( (currentPage?.charts.length || 0) * 6 ) % 12, // Use 6 for 2 columns per row
          y: Infinity,
          w: 6, h: 10, minW: 3, minH: 6 // Increased default width/height for PBI
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
          onPageChange={(pageId) => { console.log(`[Dashboard] Page changed to: ${pageId}`); setCurrentPageId(pageId);}}
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
              onToggleChart={toggleChartVisibility}
              onAddChart={addChartToPage}
              isEditMode={isEditMode}
              isCurrentPageDefault={currentPage?.isDefault || false}
            />

            <main className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-gray-800">
              <ScrollArea className="h-full w-full">
                <div className="p-4 md:p-6">
                    {/* Hide "Add Power BI Visual" button if on a default page */}
                    {isEditMode && !currentPage?.isDefault && (
                        <div className="mb-4 text-right">
                            <Button onClick={() => setIsAddPbiModalOpen(true)}>Add Power BI Visual</Button>
                        </div>
                    )}

                  {visibleCharts.length > 0 ? (
                    <DraggableChartGrid
                      charts={visibleCharts}
                      isEditMode={isEditMode}
                      onRemoveChart={removeChartFromPage}
                      onLayoutChange={handleLayoutChange}
                      onAskQuestion={handleAskQuestionAboutChart}
                      pageId={currentPageId}
                      savedLayout={currentPage?.layout}
                      mainEmbedData={mainEmbedData}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                      <div className="text-center space-y-4 p-8">
                        <div className="text-6xl opacity-20">📊</div>
                        <h3 className="text-2xl font-semibold text-gray-600 dark:text-gray-300">
                          {currentPage?.name} is Empty
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md">
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