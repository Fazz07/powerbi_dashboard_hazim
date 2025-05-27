
import React from 'react';
import PowerBIReport from '@/components/PowerBIReport';

export const useChartRenderer = () => {
  const renderIframeChart = (content: string, name: string) => {
    // Ensure we're cleanly passing the URL to the PowerBIReport component
    const trimmedUrl = content.trim();
    return <PowerBIReport url={trimmedUrl} title={name} />;
  };

  return {
    renderIframeChart
  };
};
