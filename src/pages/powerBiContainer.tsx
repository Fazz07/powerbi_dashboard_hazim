// PowerBIContainer.tsx
import React, { useRef, useEffect } from 'react';
import * as pbi from 'powerbi-client';
import { powerBiService, PowerBiEmbedData } from '@/services/powerBiUtils';

interface PowerBIContainerProps {
  embedData: PowerBiEmbedData;
  pageName: string;
  visualName: string;
}

export default function PowerBIContainer({ embedData, pageName, visualName }: PowerBIContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Clean up any old embed
    powerBiService.reset(containerRef.current);

    const config: pbi.IVisualEmbedConfiguration = {
      type: 'visual',
      accessToken: embedData.token,
      embedUrl: embedData.embedUrl,
      id: embedData.reportId,
      pageName,
      visualName,
      permissions: pbi.models.Permissions.Read,
      tokenType: pbi.models.TokenType.Embed
    };

    const visual = powerBiService.embed(containerRef.current, config);
    return () => {
      powerBiService.reset(containerRef.current!);
    };
  // We pass an empty deps array so React never re‑runs this effect after mount
  }, []);

  // React will never try to diff _inside_ this div
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
