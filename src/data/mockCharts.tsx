// src/data/mockCharts.tsx
import { ChartType } from '@/types/chart';
import { BarChart, PieChart, LineChart } from 'lucide-react'; // Example icons

// Remove generateChartContent or adapt it if you still need SVG for non-PBI charts.
// For PBI charts, 'content' will be managed by the embedding logic.

export const mockCharts: ChartType[] = [
  {
    id: 'pbi-sales-by-region', // New ID for PBI version
    name: 'PBI: Sales by Region',
    icon: <PieChart className="text-blue-500" />,
    type: 'powerbi',
    content: 'Power BI visual for sales by region.', // Descriptive text
    powerBiConfig: {
      pageName: 'ReportSectionxxxxxxxxxxxxxxx1', // Replace with your actual Page Name from PBI
      visualName: 'VisualContainerxxxxxxxxxxxx1', // Replace with your actual Visual Name from PBI
    },
    layout: { i: 'pbi-sales-by-region', x: 0, y: 0, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'Which region performed the best last quarter via PBI?',
      'Are there any low-performing regions in the PBI data?'
    ]
  },
  {
    id: 'pbi-product-performance', // New ID
    name: 'PBI: Product Performance',
    icon: <BarChart className="text-green-500" />,
    type: 'powerbi',
    content: 'Power BI visual for product performance.',
    powerBiConfig: {
      pageName: 'ReportSectionxxxxxxxxxxxxxxx2', // Replace
      visualName: 'VisualContainerxxxxxxxxxxxx2', // Replace
    },
    layout: { i: 'pbi-product-performance', x: 4, y: 0, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'Which product is generating the most revenue (PBI)?',
      'PBI: Declining product trends?'
    ]
  },
  // Keep your existing iframe Power BI report if you still want it as a full iframe
  {
    id: 'power-bi-report-iframe', // Renamed to distinguish
    name: 'Power BI Report (Full Iframe)',
    type: 'iframe',
    content: "https://app.powerbi.com/view?r=eyJrIjoiNmY0ZDU4MTEtZDkyMy00MTBmLTlhODEtNThlOGZkZWI5ZDlmIiwidCI6IjY4YmFlMDQ4LWMzMTAtNGVjMi05MzRmLWNiYzI1ODhmMzBmZSIsImMiOjl9", // Your existing URL
    icon: <span className="text-yellow-500">📊</span>, // Placeholder icon
    layout: { i: 'power-bi-report-iframe', x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 3 },
    askableQuestions: [
      "What are the key insights from this full Power BI report?",
    ]
  },
  // ... other non-PBI charts or more PBI charts
  {
    id: 'monthly-trends-original', // Keeping an original non-PBI chart as an example
    name: 'Monthly Trends (SVG)',
    icon: <LineChart className="text-purple-500" />,
    type: 'line', // Assuming 'line' means your original SVG rendering
    content: `<svg>...</svg>`, // Your mock SVG content
    layout: { i: 'monthly-trends-original', x: 8, y: 0, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'What are the key trends in the last 6 months (SVG)?',
    ]
  }
];