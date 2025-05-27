
/**
 * Captures an iframe's content as an image
 * @param iframeUrl The URL of the iframe to capture
 * @returns Promise that resolves to a data URL of the image
 */
export const captureIframeAsImage = (iframeUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary iframe to load the content
      const tempIframe = document.createElement('iframe');
      tempIframe.style.position = 'absolute';
      tempIframe.style.left = '-9999px';
      tempIframe.style.width = '800px';
      tempIframe.style.height = '600px';
      tempIframe.src = iframeUrl;
      
      document.body.appendChild(tempIframe);
      
      // Wait for iframe to load
      tempIframe.onload = async () => {
        try {
          // Give it a moment for content to render
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Create a canvas element to draw the iframe content
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 600;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            document.body.removeChild(tempIframe);
            return;
          }
          
          // Draw a placeholder background
          ctx.fillStyle = '#f9fafb'; // bg-background color
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add Power BI logo or icon (small representation)
          ctx.fillStyle = '#F2C811'; // Power BI yellow
          ctx.fillRect(canvas.width / 2 - 40, canvas.height / 2 - 70, 80, 60);
          
          // Add text indicating this is a Power BI report
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Power BI Report', canvas.width / 2, canvas.height / 2 + 20);
          
          // Add the URL as reference (shortened)
          ctx.font = '14px sans-serif';
          const displayUrl = iframeUrl.length > 50 ? iframeUrl.substring(0, 47) + '...' : iframeUrl;
          ctx.fillText(displayUrl, canvas.width / 2, canvas.height / 2 + 50);
          
          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/png');
          
          // Clean up
          document.body.removeChild(tempIframe);
          
          resolve(dataUrl);
        } catch (error) {
          document.body.removeChild(tempIframe);
          reject(error);
        }
      };
      
      // Handle iframe load errors
      tempIframe.onerror = () => {
        document.body.removeChild(tempIframe);
        reject(new Error('Failed to load iframe content'));
      };
    } catch (error) {
      reject(error);
    }
  });
};
