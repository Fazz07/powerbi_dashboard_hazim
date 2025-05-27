
import { useState, useEffect, useRef } from 'react';
import { svgToDataUrl } from '@/utils/svgUtils';

interface ChartScreenshotProps {
  htmlContent: string;
  width?: number;
  height?: number;
}

const ChartScreenshot = ({ htmlContent, width, height }: ChartScreenshotProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!htmlContent) return;

    const captureChart = async () => {
      try {
        // Create a temporary container to render the HTML
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        // Use the provided dimensions or default values
        tempContainer.style.width = width ? `${width}px` : '500px';
        tempContainer.style.height = height ? `${height}px` : '300px';
        tempContainer.innerHTML = htmlContent;
        document.body.appendChild(tempContainer);

        // Wait a moment for any scripts in the HTML to execute
        await new Promise(resolve => setTimeout(resolve, 100));

        // Find SVG elements in the container
        const svgElement = tempContainer.querySelector('svg');
        
        if (svgElement) {
          // Set the SVG dimensions to match container if needed
          if (width) svgElement.setAttribute('width', width.toString());
          if (height) svgElement.setAttribute('height', height.toString());
          
          // Convert SVG to data URL
          const dataUrl = await svgToDataUrl(svgElement);
          setImageUrl(dataUrl);
        } else {
          console.warn('No SVG element found in chart content');
          setImageUrl(null);
        }

        // Remove the temporary container
        document.body.removeChild(tempContainer);
      } catch (error) {
        console.error('Error capturing chart:', error);
        // Set a fallback image or message
        setImageUrl(null);
      }
    };

    captureChart();
  }, [htmlContent, width, height]);

  if (!imageUrl) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">Loading chart image...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <img 
        src={imageUrl} 
        alt="Chart visualization" 
        className="w-full h-full object-contain"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
};

export default ChartScreenshot;
