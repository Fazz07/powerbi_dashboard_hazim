// src/data/mockCharts.tsx
import { ChartType } from '@/types/chart';
import { AlignEndHorizontal, Activity, LayoutDashboard, DollarSign, Users, TrendingUp } from 'lucide-react';

export const mockCharts: ChartType[] = [
  {
    id: 'pbi-marketing-performance-visual',
    name: 'Marketing Performance (PBI)',
    type: 'powerbi',
    content: 'A Power BI visual showing marketing campaign performance metrics.',
    icon: <TrendingUp className="h-5 w-5 " style={{ color: '#a985db' }} />,
    layout: { i: 'pbi-marketing-performance-visual', x: 0, y: 20, w: 6, h: 10, minW: 1, minH: 6 }, // Changed w to 6, minW to 1
    powerBiConfig: {
      pageName: 'ReportSection4b3fbaa7dd7908d906d9',
      visualName: '3a28c5fee26bd29ff352',
    },
    askableQuestions: [
      'What are the earnings of Power BI',
      'Who\'s earned higher between powerApps and PowerPoint?',
    ],
  },
  {
    id: 'overview-pbi-revenue-trends-visual',
    name: 'Sales Summary (PBI) - Revenue Trends',
    type: 'powerbi',
    content: 'A Power BI visual showing revenue trends over time.',
    icon: <DollarSign className="h-5 w-5 " style={{ color: '#a985db' }} />,
    layout: { i: 'overview-pbi-revenue-trends-visual', x: 0, y: 10, w: 6, h: 10, minW: 1, minH: 6 }, // Changed w to 6, minW to 1
        powerBiConfig: {
          pageName: 'ReportSection998e2850a99cabad87e8',
          visualName: '3a28c5fee26bd29ff352',
    },
    askableQuestions: [
      'What are the retrns from OneNote?', 
      'Highlight me the difference of returns between Sharepoint and Access'
    ],
  },
  {
    id: 'pbi-store-breakdown-visual',
    name: 'Sales Summary (PBI) - Store Breakdown',
    type: 'powerbi',
    content: 'A Power BI visual showing sales performance metrics per store.',
    icon: <DollarSign className="h-5 w-5 " style={{ color: '#a985db' }} />,
    layout: { i: 'pbi-store-breakdown-visual', x: 0, y: 10, w: 6, h: 10, minW: 1, minH: 6 }, // Changed w to 6, minW to 1
    powerBiConfig: {
      pageName: 'ReportSection4b3fbaa7dd7908d906d9',
      visualName: 'd55aa7aa40745de10d55',
    },
    askableQuestions: [
      'How much amount did VanArsdel earn?',
      'What is the difference of amount earned between Salvus and Victoria.',
    ],
  },
  {
    id: 'pbi-customer-demographics-visual',
    name: 'Customer Demographics (PBI)',
    type: 'powerbi',
    content: 'A Power BI visual displaying customer demographic information.',
    icon: <Users className="h-5 w-5 " style={{ color: '#a985db' }} />,
    layout: { i: 'pbi-customer-demographics-visual', x: 0, y: 20, w: 6, h: 10, minW: 1, minH: 6 }, // Changed w to 6, minW to 1
    powerBiConfig: {
      pageName: 'ReportSectiona37d01e834c17d07bbeb',
      visualName: 'b33397810d555ca70a8c',
    },
    askableQuestions: [
      'What is the net sales of Abbas?',
      'What is the difference of net sales between Leo and Barba.',
    ],
  },
  // Add a 6th visual if you want a complete 2x3 grid (3 rows of 2 visuals)
  {
    id: 'overview-pbi-category-breakdown-visual',
    name: 'Sales Summary (PBI) - Category Breakdown',
    type: 'powerbi',
    content: 'A Power BI visual showing sales summary by product category.',
    icon: <LayoutDashboard className="h-5 w-5 " style={{ color: '#a985db' }} />,
    layout: { i: 'overview-pbi-category-breakdown-visual', x: 0, y: 0, w: 6, h: 10, minW: 1, minH: 6 }, // Changed w to 6, minW to 1
    powerBiConfig: {
      pageName: 'ReportSectiona37d01e834c17d07bbeb',
      visualName: '805719ca6000cb000be2',
    },
    askableQuestions: ['What are the earnings of march 2019?', 'in which month were the earnings maximum.'],
  },
];