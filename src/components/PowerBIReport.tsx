
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface PowerBIReportProps {
  url: string;
  title: string;
}

const PowerBIReport = ({ url, title }: PowerBIReportProps) => {
  // Ensure the URL is properly formatted and not being modified
  const safeUrl = url.trim();
  
  return (
    <Card className="w-full h-full overflow-hidden">
      <CardContent className="p-0 h-full">
        <iframe
          src={safeUrl}
          title={title}
          width="100%"
          height="100%"
          style={{ border: "none" }}
          allowFullScreen
        />
      </CardContent>
    </Card>
  );
};

export default PowerBIReport;
