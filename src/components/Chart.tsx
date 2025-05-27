// src/components/Chart.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartType } from '@/types/chart';
import { X, Loader2 } from 'lucide-react'; // Added Loader2
// svgToDataUrl and captureIframeAsImage might not be needed for 'powerbi' type in chat.
// Keep them if you still use them for other chart types.
import { svgToDataUrl } from '@/utils/svgUtils';
import { captureIframeAsImage } from '@/utils/iframeUtils';
import { useToast } from '@/hooks/use-toast';

interface ChartProps {
  chart: ChartType;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onAskQuestion: (question: string, chartId: string, chartContent?: string) => void;
  // New prop to pass the container ref up to Dashboard.tsx
  onPbiContainerRefChange?: (chartId: string, element: HTMLDivElement | null) => void;
  isPbiVisualLoading?: boolean; // Optional: to show specific PBI loading state
}

const Chart = ({
  chart,
  isEditMode,
  onRemove,
  onAskQuestion,
  onPbiContainerRefChange,
  isPbiVisualLoading
}: ChartProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false); // For "Ask AI" button
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null); // Overall card ref
  const chartContentRef = useRef<HTMLDivElement>(null); // Ref for the content area

  // Effect to pass the chartContentRef up if this chart is for Power BI
  useEffect(() => {
    if (chart.type === 'powerbi' && onPbiContainerRefChange) {
      onPbiContainerRefChange(chart.id, chartContentRef.current);
      // Cleanup function to notify parent when ref is detached (component unmounts)
      return () => {
        onPbiContainerRefChange(chart.id, null);
      };
    }
  }, [chart.id, chart.type, onPbiContainerRefChange, chartContentRef]); // Rerun if ref itself changes

  // Original screenshot logic (might need adjustment for 'powerbi' type)
  useEffect(() => {
    if (chart.type === 'iframe' || chart.type === 'powerbi') {
        setScreenshotUrl(null); // Don't attempt screenshot for PBI visuals or iframes here
        return;
    }
    
    const captureChartImage = async () => {
      // ... (your existing SVG capture logic) ...
      // This part remains for non-PBI, non-iframe charts
        if (chartContentRef.current && chart.content && !chart.type.match(/^(iframe|powerbi)$/)) {
            try {
                // Create a hidden temporary container with the chart content
                const tempContainer = document.createElement('div');
                // ... (rest of your SVG capture logic)
                const svgElement = tempContainer.querySelector('svg');
                if (svgElement) {
                    const dataUrl = await svgToDataUrl(svgElement);
                    setScreenshotUrl(dataUrl);
                } else { setScreenshotUrl(null); }
                // ...
            } catch (error) {
                console.error('Failed to capture chart image:', error);
                setScreenshotUrl(null);
            }
        }
    };

    if (chartContentRef.current) {
        // Debounce or delay if charts render asynchronously
        const timer = setTimeout(captureChartImage, 300);
        return () => clearTimeout(timer);
    }
  }, [chart.content, chart.type, chartContentRef]);


  const handleAskQuestion = async (question: string) => {
    setIsLoading(true);
    try {
      let contentForAI = chart.content;
      if (chart.type === 'powerbi') {
        // For PBI, we don't have simple HTML content. Send metadata or a placeholder.
        contentForAI = `Power BI Visual: ${chart.name}`;
        // Or, if you implement a way to get a PBI visual image from backend:
        // contentForAI = await getPbiVisualScreenshot(chart.id);
      } else if (chart.type === 'iframe') {
        // ... your existing iframe capture logic ...
        // For iframe charts, capture as image before sending
        try {
          toast({ title: "Capturing chart", description: "Taking a snapshot of the Power BI report..." });
          const imageDataUrl = await captureIframeAsImage(chart.content); // Assuming chart.content is URL
          contentForAI = imageDataUrl || chart.content; // Fallback to URL
        } catch (error) {
          console.error('Failed to capture iframe as image:', error);
          toast({ title: "Capture failed", description: "Using URL reference instead", variant: "destructive" });
          contentForAI = chart.content;
        }
      }
      onAskQuestion(question, chart.id, contentForAI);
    } catch (error) {
      console.error('Failed to process chart content for AI:', error);
      onAskQuestion(question, chart.id, chart.content); // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(chart.id);
  };

  return (
    <Card ref={chartRef} className="overflow-hidden relative flex flex-col h-full">
      {isEditMode && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-10 chart-delete-button" // Ensure z-index
          onClick={handleDeleteClick}
          // Add mouse/touch event stoppers if using react-grid-layout's draggableCancel
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
      
      {/* This div is where Power BI visual will be embedded by Dashboard.tsx */}
      <div 
        ref={chartContentRef} 
        className="flex-1 min-h-[300px] bg-background relative flex items-center justify-center" // Added flex for centering loader
        id={`pbi-container-${chart.id}`} // Useful for debugging
      >
        {chart.type === 'powerbi' && (
          isPbiVisualLoading === true ? ( // Check if explicitly true
            <div className="text-muted-foreground flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              Loading Power BI Visual...
            </div>
          ) : isPbiVisualLoading === false ? null : ( // If false, PBI is rendered or error. If undefined, show initial text.
             <p className="text-muted-foreground">Initializing Power BI Visual...</p>
          )
        )}
        {chart.type === 'iframe' && (
          <iframe
            src={chart.content}
            title={chart.name}
            className="w-full h-full border-none"
            allowFullScreen
          />
        )}
        {/* For other chart types (SVG based) */}
        {chart.type !== 'powerbi' && chart.type !== 'iframe' && (
          screenshotUrl ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={screenshotUrl} 
                alt={chart.name} 
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            // Fallback or initial loading for SVG based charts
            <div className="w-full h-full flex items-center justify-center bg-muted/10">
              <p className="text-muted-foreground">Loading chart image...</p>
            </div>
          )
        )}
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
              disabled={isLoading}
            >
              {question}
              {isLoading && idx === 0 && <span className="ml-2 animate-pulse">...</span>}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default Chart;