// src/types/chart.ts
import { Layout } from 'react-grid-layout';
import React from 'react';

// Define PowerBiConfig if it's not already defined elsewhere and imported
export interface PowerBiConfig {
  pageName: string;
  visualName: string;
  // reportId?: string; // Not strictly needed here if mainEmbedData provides it
  // embedUrl?: string; // Not strictly needed here if mainEmbedData provides it
}

export interface AISuggestion {
  question: string;
}

export type ChartType = {
  id: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'scatter' | 'iframe' | 'powerbi'; // <-- ADDED 'powerbi'
  content: string; // For PBI, this is a description. For iframe, it's URL. For others, SVG/data.
  icon: React.ReactNode;
  layout: Layout;
  powerBiConfig?: PowerBiConfig; // <-- ADDED for Power BI visuals
  askableQuestions: string[];
  suggestions?: AISuggestion[]; // For backward compatibility
  isDynamicPBI?: boolean;      // <-- ADDED for dynamically added PBI visuals
};