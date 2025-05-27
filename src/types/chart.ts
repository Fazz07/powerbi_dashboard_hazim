// src/types/chart.ts
import { Layout } from 'react-grid-layout';
import React from 'react';

export interface AISuggestion {
  question: string;
}

// Define what a Power BI visual configuration looks like
export interface PowerBiConfig {
  pageName: string;
  visualName: string;
  reportId?: string; // The ID of the *base report* in Power BI service, if different per visual
}

export type ChartType = {
  id: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'scatter' | 'iframe' | 'powerbi'; // Added 'powerbi'
  content: string; // For 'iframe' URLs or general description. For 'powerbi', this might be less relevant.
  icon: React.ReactNode;
  layout: Layout;
  askableQuestions: string[];
  suggestions?: AISuggestion[];
  powerBiConfig?: PowerBiConfig; // New: Configuration for Power BI visuals
  isDynamicPBI?: boolean; // Flag if it's added dynamically by the user
  // dynamicPBIReportId?: string | number; // Original ID from the selection modal for dynamic PBI
};