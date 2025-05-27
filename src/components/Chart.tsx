import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartType } from '@/types/chart';
import { X } from 'lucide-react';
import { svgToDataUrl } from '@/utils/svgUtils';
import { captureIframeAsImage } from '@/utils/iframeUtils';
import { useToast } from '@/hooks/use-toast';

interface ChartProps {
  chart: ChartType;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onAskQuestion: (question: string, chartId: string, chartContent?: string) => void;
}

const Chart = ({ chart, isEditMode, onRemove, onAskQuestion }: ChartProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const chartRef = useRef<HTMLDivElement>(null);
  const chartContentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Setup resize observer to track container dimensions
  useEffect(() => {
    if (chartContentRef.current) {
      const updateDimensions = () => {
        if (chartContentRef.current) {
          const { width, height } = chartContentRef.current.getBoundingClientRect();
          setDimensions({ width, height });
        }
      };

      // Initial size calculation
      updateDimensions();

      // Setup resize observer
      resizeObserverRef.current = new ResizeObserver(updateDimensions);
      resizeObserverRef.current.observe(chartContentRef.current);

      return () => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
      };
    }
  }, []);

  // Special handling for iframe type charts
  const isIframeChart = chart.type === 'iframe';

  // Capture screenshot of the chart content only for non-iframe charts
  useEffect(() => {
    // Skip screenshot capture for iframe charts
    if (isIframeChart) return;
    
    const captureChartImage = async () => {
      try {
        // Create a hidden temporary container with the chart content
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = `${dimensions.width || 600}px`;
        tempContainer.style.height = `${dimensions.height || 300}px`;
        tempContainer.innerHTML = chart.content;
        document.body.appendChild(tempContainer);

        // Wait a moment for any scripts to execute
        await new Promise(resolve => setTimeout(resolve, 100));

        // Find SVG elements in the container
        const svgElement = tempContainer.querySelector('svg');
        
        if (svgElement) {
          // Set SVG dimensions to match container
          if (dimensions.width) svgElement.setAttribute('width', dimensions.width.toString());
          if (dimensions.height) svgElement.setAttribute('height', dimensions.height.toString());
          
          // Convert SVG to data URL
          const dataUrl = await svgToDataUrl(svgElement);
          setScreenshotUrl(dataUrl);
        } else {
          console.warn('No SVG element found in chart content');
          // Fallback to using the entire content as HTML if no SVG is found
          setScreenshotUrl(null);
        }

        // Remove temp container
        document.body.removeChild(tempContainer);
      } catch (error) {
        console.error('Failed to capture chart image:', error);
        setScreenshotUrl(null);
      }
    };

    if (dimensions.width > 0 && dimensions.height > 0) {
      captureChartImage();
    }
  }, [chart.content, dimensions.width, dimensions.height, isIframeChart]);

  const handleAskQuestion = async (question: string) => {
    setIsLoading(true);
    
    try {
      // For iframe charts, capture as image before sending
      if (isIframeChart) {
        try {
          toast({
            title: "Capturing chart",
            description: "Taking a snapshot of the Power BI report...",
          });
          
          // Capture the iframe as an image
          const imageDataUrl = await captureIframeAsImage(chart.content);
          
          if (imageDataUrl) {
            onAskQuestion(question, chart.id, imageDataUrl);
          } else {
            // Fallback to just sending the URL if capture returns empty
            toast({
              title: "Capture failed",
              description: "Using URL reference instead",
              variant: "destructive"
            });
            onAskQuestion(question, chart.id, chart.content);
          }
        } catch (error) {
          console.error('Failed to capture iframe as image:', error);
          toast({
            title: "Capture failed",
            description: "Using URL reference instead",
            variant: "destructive"
          });
          // Fallback to just sending the URL if capture fails
          onAskQuestion(question, chart.id, chart.content);
        }
      } else {
        // For other charts, pass the chart content as before
        onAskQuestion(question, chart.id, chart.content);
      }
    } catch (error) {
      console.error('Failed to process chart content:', error);
      onAskQuestion(question, chart.id, chart.content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Delete button clicked for chart:', chart.id);
    onRemove(chart.id);
  };

  return (
    <Card ref={chartRef} className="overflow-hidden relative flex flex-col h-full">
      {isEditMode && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 z-50 chart-delete-button"
          onClick={handleDeleteClick}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          aria-label="Remove chart"
          style={{ pointerEvents: 'auto' }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">{chart.name}</h3>
      </div>
      
      <div 
        ref={chartContentRef} 
        className="flex-1 min-h-[300px] bg-background relative"
      >
        {isIframeChart ? (
          // Direct iframe rendering for iframe type charts
          <iframe
            src={chart.content}
            title={chart.name}
            className="w-full h-full border-none"
            allowFullScreen
          />
        ) : screenshotUrl ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img 
              src={screenshotUrl} 
              alt={chart.name} 
              className="w-full h-full object-contain"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/10">
            <p className="text-muted-foreground">Loading chart image...</p>
          </div>
        )}
        
        {/* Keep the iframe but hidden to ensure scripts still run for non-iframe charts */}
        {!isIframeChart && (
          <iframe
            ref={iframeRef}
            className="hidden"
            title={chart.name}
            srcDoc={chart.content}
            sandbox="allow-same-origin allow-scripts"
            loading="eager"
          />
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
