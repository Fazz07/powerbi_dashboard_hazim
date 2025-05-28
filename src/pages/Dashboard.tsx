// src/pages/Dashboard.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import EnhancedSidebar from '@/components/EnhancedSidebar';
import PageSidebar from '@/components/PageSidebar';
import ChatbotPanel from '@/components/ChatbotPanel';
import DraggableChartGrid from '@/components/DraggableChartGrid';
import { Layout as RGL_Layout } from 'react-grid-layout';
import { mockCharts as initialMockCharts } from '@/data/mockCharts';
import { ChartType, PowerBiConfig } from '@/types/chart';
import { ChatMessage, ChatSuggestion } from '@/types/chat'; // Ensure ChatMessage has isLoading
import { useToast } from '@/hooks/use-toast';
import { usePageManager } from '@/hooks/usePageManager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { fetchMainEmbedData, PowerBiEmbedData } from '@/services/powerBiUtils';
import { ModalWindow, Report as ModalReport } from '@/components/ModalWindow';
import { Button } from '@/components/ui/button';

// Add the API base URL from Vite environment variables
const API_BASE_URL = import.meta.env.VITE_YOUR_BACKEND_API_URL || 'http://localhost:3000';

const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
  { question: 'What is the current overall revenue trend?' },
  { question: 'Summarize key sales metrics for this quarter.' },
  { question: 'Show me customer demographics by age group.' },
  { question: 'How is marketing campaign performance looking?' },
  { question: 'Analyze conversion rates across different channels.' },
];
const DYNAMIC_PBI_CONFIG_MAP: Record<string, PowerBiConfig> = {
  "Category Breakdown": { pageName: "ReportSection998e2850a99cabad87e8", visualName: "3a28c5fee26bd29ff352" },
  "Revenue Trends": { pageName: "ReportSection998e2850a99cabad87e8", visualName: "d55aa7aa40745de10d55" },
  "Store Breakdown": { pageName: "ReportSection4b3fbaa7dd7908d906d9", visualName: "3a28c5fee26bd29ff352" },
};

// Helper function to get auth token
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

// Helper function to map frontend chat history to LLM expected format
const mapChatHistoryToLLMFormat = (history: ChatMessage[]) => {
  return history.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
    content: msg.message,
  })).filter(msg => msg.content.trim() !== ''); // Filter out empty messages
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
    updatePageCharts, updatePageLayout, currentPage
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
      updatePageCharts(currentPageId, currentChartIds.filter((id: string) => id !== chartId));
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
    updatePageCharts(currentPageId, (currentPage?.charts || []).filter((id: string) => id !== chartId));
    if (selectedChartForAI === chartMeta?.name) {
      setSelectedChartForAI(undefined);
    }
    toast({ title: "Chart Removed", description: `${chartMeta?.name || 'Chart'} removed from ${currentPage?.name}` });
  };

  const handleLayoutChange = (newLayout: RGL_Layout[]) => {
    console.log('[Dashboard] handleLayoutChange:', newLayout);
    updatePageLayout(currentPageId, { lg: newLayout });
  };

  // Function to handle sending message and receiving streaming response
  const sendChatMessage = async (userInput: string, chartData: string | undefined, chartName?: string) => {
    setIsChatOpen(true);
    setSelectedChartForAI(chartName);

    // Add user message to history
    setChatHistory(prev => [
      ...prev,
      { message: userInput, isUser: true, chartContent: chartData },
    ]);

    // Add placeholder AI message
    const aiMessageIndex = chatHistory.length + 1; // Index where the AI message will be after user message
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

    try {
      const response = await fetch(`${API_BASE_URL}/llm-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` // Include auth token
        },
        body: JSON.stringify({
          userInput: userInput,
          data: chartData || "No specific chart data provided.", // Send data to LLM
          messages: mapChatHistoryToLLMFormat(chatHistory), // Send existing chat history
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

      // Mock AI response ("hello how are you") logic
      // // This will override actual streamed content for the purpose of the mock requirement
      // const mockResponse = "hello how are you";
      // let mockResponseIndex = 0;

      // const appendMockResponse = () => {
      //     if (mockResponseIndex < mockResponse.length) {
      //         const char = mockResponse[mockResponseIndex];
      //         accumulatedContent += char;
      //         setChatHistory(prev => prev.map((msg, idx) => idx === aiMessageIndex ? { ...msg, message: accumulatedContent, isLoading: true } : msg));
      //         mockResponseIndex++;
      //         setTimeout(appendMockResponse, 20); // Simulate typing speed
      //     } else {
      //         setChatHistory(prev => prev.map((msg, idx) => idx === aiMessageIndex ? { ...msg, isLoading: false } : msg));
      //     }
      // };
      // appendMockResponse(); // Start the mock typing effect


      // The following stream processing logic is commented out because the mock response
      // requirement overrides actually consuming the SSE stream.
      // If you want to switch to real streaming, uncomment this and remove the mock logic above.

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream complete');
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        // SSE chunks typically look like: "data: {json_payload}\n\n"
        // We need to parse the JSON content from the 'data:' line
        chunk.split('\n').forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const jsonString = line.substring(6);
              if (jsonString === '[DONE]') { // Check for OpenAI stream end signal
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

  const handleSendMessageToAI = (message: string) => {
    // Clear any selected chart context for general questions
    sendChatMessage(message, undefined, undefined);
  };

  const handleAskQuestionAboutChart = (question: string, chartId: string, chartContent?: string) => {
    const chartMeta = allCharts.find(c => c.id === chartId);
    // Send chart-specific question, passing chart content and name
    sendChatMessage(question, chartContent, chartMeta?.name);
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