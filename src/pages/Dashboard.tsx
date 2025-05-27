import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import EnhancedSidebar from '@/components/EnhancedSidebar';
import PageSidebar from '@/components/PageSidebar';
import ChatbotPanel from '@/components/ChatbotPanel';
import DraggableChartGrid from '@/components/DraggableChartGrid';
import { Layout } from 'react-grid-layout';
import { mockCharts } from '@/data/mockCharts';
import { ChartType } from '@/types/chart';
import { ChatMessage, ChatSuggestion } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { usePageManager } from '@/hooks/usePageManager';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
  { question: "What insights can I get from these charts?" },
  { question: "What are the most important trends here?" },
  { question: "How can I improve my business based on this data?" }
];

// Power BI embed URL for the iframe report
const POWER_BI_REPORT_URL = "https://app.powerbi.com/view?r=eyJrIjoiNmY0ZDU4MTEtZDkyMy00MTBmLTlhODEtNThlOGZkZWI5ZDlmIiwidCI6IjY4YmFlMDQ4LWMzMTAtNGVjMi05MzRmLWNiYzI1ODhmMzBmZSIsImMiOjl9";

const Dashboard = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [allCharts, setAllCharts] = useState<ChartType[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [activeSuggestions, setActiveSuggestions] = useState<ChatSuggestion[]>(DEFAULT_SUGGESTIONS);
  const [selectedChart, setSelectedChart] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    pages,
    currentPageId,
    setCurrentPageId,
    addPage,
    deletePage,
    updatePageCharts,
    updatePageLayout,
    getCurrentPage
  } = usePageManager();
  
  // Check if user is logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
    }
  }, [navigate]);

  // Load charts and add Power BI report
  useEffect(() => {
    const powerBIReport: ChartType = {
      id: 'power-bi-report',
      name: 'Power BI Report',
      type: 'iframe',
      content: POWER_BI_REPORT_URL,
      icon: <iframe 
              src={POWER_BI_REPORT_URL} 
              title="Power BI Report" 
              className="h-4 w-4"
              frameBorder="0" 
              allowFullScreen
            />,
      layout: { i: 'power-bi-report', x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 3 },
      askableQuestions: [
        "What are the key insights from this Power BI report?",
        "How can I use this data to improve performance?",
        "What trends do you see in this report?"
      ]
    };
    
    setAllCharts([...mockCharts]);
  }, []);

  const toggleEditMode = () => {
    if (isEditMode) {
      toast({
        title: "Layout saved",
        description: "Your dashboard layout has been saved"
      });
    }
    setIsEditMode(!isEditMode);
  };

  const currentPage = getCurrentPage();
  const visibleCharts = allCharts.filter(chart => 
    currentPage?.charts.includes(chart.id) || []
  );

  const toggleChart = (chartId: string) => {
    const currentCharts = currentPage?.charts || [];
    const isVisible = currentCharts.includes(chartId);
    
    if (isVisible) {
      // Remove chart from page
      const updatedCharts = currentCharts.filter(id => id !== chartId);
      updatePageCharts(currentPageId, updatedCharts);
      
      const chartName = allCharts.find(chart => chart.id === chartId)?.name;
      toast({
        title: "Chart removed",
        description: `${chartName} has been removed from ${currentPage?.name}`
      });
    } else {
      // Add chart to page
      updatePageCharts(currentPageId, [...currentCharts, chartId]);
      
      const chartName = allCharts.find(chart => chart.id === chartId)?.name;
      toast({
        title: "Chart added",
        description: `${chartName} has been added to ${currentPage?.name}`
      });
    }
  };

  const addChart = (chartId: string) => {
    const currentCharts = currentPage?.charts || [];
    if (!currentCharts.includes(chartId)) {
      updatePageCharts(currentPageId, [...currentCharts, chartId]);
      
      const chartName = allCharts.find(chart => chart.id === chartId)?.name;
      toast({
        title: "Chart added",
        description: `${chartName} has been added to ${currentPage?.name}`
      });
    }
  };

  const removeChart = (chartId: string) => {
    const chartToRemove = allCharts.find(chart => chart.id === chartId);
    const currentCharts = currentPage?.charts || [];
    
    // Remove chart from page
    const updatedCharts = currentCharts.filter(id => id !== chartId);
    updatePageCharts(currentPageId, updatedCharts);
    
    // Clear selected chart if it was the removed one
    if (selectedChart === chartToRemove?.name) {
      setSelectedChart(undefined);
    }
    
    console.log('Removing chart:', chartId, 'from page:', currentPageId);
    console.log('Updated charts:', updatedCharts);
    
    toast({
      title: "Chart removed",
      description: `${chartToRemove?.name || 'Chart'} has been removed from ${currentPage?.name}`
    });
  };

  const handleLayoutChange = (layout: Layout[]) => {
    console.log('Layout changed for page:', currentPageId, layout);
    const layoutData = { lg: layout };
    updatePageLayout(currentPageId, layoutData);
  };

  const handleSendMessage = (message: string) => {
    setChatHistory(prev => [
      ...prev, 
      { 
        message, 
        isUser: true
      }
    ]);

    setTimeout(() => {
      let response = "I'll analyze that for you...";
      
      if (message.toLowerCase().includes('best') || message.toLowerCase().includes('top')) {
        response = "The North region is currently your top performer with 25% growth year over year. Sales in this region have consistently outpaced other areas for the last 3 quarters.";
      } else if (message.toLowerCase().includes('trend') || message.toLowerCase().includes('pattern')) {
        response = "I'm noticing a cyclical pattern in your data, with peaks in Q4 and Q1, followed by slight dips in Q2 and Q3. This seasonal pattern appears consistent across the past 2 years of data.";
      } else if (message.toLowerCase().includes('improvement') || message.toLowerCase().includes('recommend')) {
        response = "Based on your data, I recommend focusing on the South region, which shows the highest potential for growth. The consumer segment in this region is underperforming compared to benchmarks by approximately 15%.";
      } else if (message.toLowerCase().includes('region') || message.toLowerCase().includes('low')) {
        response = "The West region is currently underperforming, with a 12% decrease in sales compared to last quarter. This appears to be driven by reduced activity in the SMB segment.";
      }

      setChatHistory(prev => [
        ...prev, 
        { message: response, isUser: false }
      ]);
      
      if (!isChatOpen) {
        setIsChatOpen(true);
      }
    }, 1000);
  };

  const handleAskQuestion = (question: string, chartId: string, chartContent?: string) => {
    const chart = allCharts.find(c => c.id === chartId);
    setSelectedChart(chart?.name);
    
    setChatHistory(prev => [
      ...prev, 
      { 
        message: question, 
        isUser: true,
        chartContent: chart?.content
      }
    ]);

    setIsChatOpen(true);
    
    setTimeout(() => {
      let response = "";
      
      if (question.toLowerCase().includes('low') || question.toLowerCase().includes('region')) {
        response = "📊 Based on the chart, the West region appears to be underperforming with a 15% drop in revenue compared to last quarter. The South region is also showing some weakness in the Enterprise segment.";
      } else {
        switch (chartId) {
          case 'sales-by-region':
            response = "🏆 The North Region outperformed others with $2.1M in revenue, a 25% increase over the previous quarter. East Region has been showing steady growth at 15% as well.";
            break;
          case 'product-performance':
            response = "📊 Product A is your best performer with 45% of total sales. However, Product C is showing the fastest growth rate at 32% month-over-month, which indicates emerging potential.";
            break;
          case 'monthly-trends':
            response = "📈 There's a clear upward trend since March, with a 12% average monthly growth. Note the significant spike in June which correlates with your summer promotion campaign.";
            break;
          case 'customer-segments':
            response = "👥 The Enterprise segment contributes 60% of your revenue but only represents 15% of your customer count. The SMB segment shows the highest potential for expansion with current penetration at only 23%.";
            break;
          case 'conversion-funnel':
            response = "⚠️ There's a significant drop-off (68%) between the Product View and Add to Cart stages. This suggests potential UX issues or pricing concerns that should be investigated.";
            break;
          default:
            response = "I've analyzed this chart and found some interesting patterns. The data shows clear segmentation between different categories with notable outliers in the upper quartile.";
        }
      }
      
      setChatHistory(prev => [
        ...prev, 
        { message: response, isUser: false }
      ]);
    }, 1500);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gray-50">
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
              onToggleChart={toggleChart}
              onAddChart={addChart}
              isEditMode={isEditMode}
            />
            
            <main className="flex-1 overflow-hidden relative bg-gray-50">
              <ScrollArea className="h-full w-full">
                <div className="min-w-full p-6">
                  {visibleCharts.length > 0 ? (
                    <DraggableChartGrid
                      charts={visibleCharts}
                      isEditMode={isEditMode}
                      onRemoveChart={removeChart}
                      onLayoutChange={handleLayoutChange}
                      onAskQuestion={handleAskQuestion}
                      pageId={currentPageId}
                      savedLayout={currentPage?.layout}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4 p-8">
                        <div className="text-6xl opacity-20">📊</div>
                        <h3 className="text-2xl font-semibold text-gray-600">
                          {currentPage?.name} is Empty
                        </h3>
                        <p className="text-gray-500 max-w-md">
                          {isEditMode 
                            ? "Add charts from the sidebar to customize this page"
                            : "Switch to edit mode to add charts to this page"
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
              onSendMessage={handleSendMessage}
              suggestions={activeSuggestions}
              selectedChart={selectedChart}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
