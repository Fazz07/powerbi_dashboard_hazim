
/**
 * Convert an SVG element or SVG string to a data URL
 * @param svgElement - The SVG element or SVG string to convert
 * @returns A Promise that resolves to a data URL of the image
 */
export const svgToDataUrl = (svgElement: SVGElement | string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      let svgString: string;
      
      if (typeof svgElement === 'string') {
        svgString = svgElement;
      } else {
        svgString = new XMLSerializer().serializeToString(svgElement);
      }
      
      // Add XML declaration if not present
      if (!svgString.startsWith('<?xml')) {
        svgString = '<?xml version="1.0" standalone="no"?>' + svgString;
      }
      
      // Create a Blob from the SVG string
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      // Create a data URL from the Blob
      const url = URL.createObjectURL(blob);
      
      // Create an Image element to properly render the SVG
      const img = new Image();
      img.onload = () => {
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 600;  // Default width if not specified
        canvas.height = img.height || 400; // Default height if not specified
        
        // Draw the image on the canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Clean up
        URL.revokeObjectURL(url);
        
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
};
