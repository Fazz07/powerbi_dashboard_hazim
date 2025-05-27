
import { Layout } from 'react-grid-layout';
import React from 'react';

export interface AISuggestion {
  question: string;
}

export type ChartType = {
  id: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'scatter' | 'iframe';
  content: string;
  icon: React.ReactNode;
  layout: Layout;
  askableQuestions: string[];
  suggestions?: AISuggestion[]; // For backward compatibility
};
