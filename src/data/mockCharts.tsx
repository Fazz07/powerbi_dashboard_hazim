
import { ChartType } from '@/types/chart';

// Generate mock chart content for visualization
const generateChartContent = (type: string, title: string) => {
  switch (type) {
    case 'pie':
      return `
        <div style="padding: 20px;">
          <svg width="100%" height="100%" viewBox="0 0 320 320">
            <g transform="translate(160, 160)">
              <!-- Pie sections -->
              <path d="M0,0 L150,0 A150,150 0 0,1 75,129.9" fill="#4f46e5" />
              <path d="M0,0 L75,129.9 A150,150 0 0,1 -75,129.9" fill="#8b5cf6" />
              <path d="M0,0 L-75,129.9 A150,150 0 0,1 -150,0" fill="#a855f7" />
              <path d="M0,0 L-150,0 A150,150 0 0,1 -75,-129.9" fill="#d946ef" />
              <path d="M0,0 L-75,-129.9 A150,150 0 0,1 75,-129.9" fill="#ec4899" />
              <path d="M0,0 L75,-129.9 A150,150 0 0,1 150,0" fill="#f43f5e" />
              <!-- Labels -->
              <text x="75" y="0" text-anchor="middle" font-size="14" fill="white">30%</text>
              <text x="37" y="64" text-anchor="middle" font-size="14" fill="white">20%</text>
              <text x="-37" y="64" text-anchor="middle" font-size="14" fill="white">15%</text>
              <text x="-75" y="0" text-anchor="middle" font-size="14" fill="white">12%</text>
              <text x="-37" y="-64" text-anchor="middle" font-size="14" fill="white">13%</text>
              <text x="37" y="-64" text-anchor="middle" font-size="14" fill="white">10%</text>
            </g>
            <text x="160" y="20" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>
          </svg>
        </div>
      `;
      
    case 'bar':
      return `
        <div style="padding: 20px;">
          <svg width="100%" height="100%" viewBox="0 0 320 260">
            <!-- Title -->
            <text x="160" y="20" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>
            
            <!-- Y-axis -->
            <line x1="40" y1="40" x2="40" y2="220" stroke="gray" stroke-width="1" />
            <text x="35" y="50" text-anchor="end" font-size="12">100</text>
            <text x="35" y="90" text-anchor="end" font-size="12">80</text>
            <text x="35" y="130" text-anchor="end" font-size="12">60</text>
            <text x="35" y="170" text-anchor="end" font-size="12">40</text>
            <text x="35" y="210" text-anchor="end" font-size="12">20</text>
            
            <!-- X-axis -->
            <line x1="40" y1="220" x2="300" y2="220" stroke="gray" stroke-width="1" />
            <text x="70" y="235" text-anchor="middle" font-size="12">Jan</text>
            <text x="110" y="235" text-anchor="middle" font-size="12">Feb</text>
            <text x="150" y="235" text-anchor="middle" font-size="12">Mar</text>
            <text x="190" y="235" text-anchor="middle" font-size="12">Apr</text>
            <text x="230" y="235" text-anchor="middle" font-size="12">May</text>
            <text x="270" y="235" text-anchor="middle" font-size="12">Jun</text>
            
            <!-- Bars -->
            <rect x="55" y="100" width="30" height="120" fill="#4f46e5" />
            <rect x="95" y="130" width="30" height="90" fill="#8b5cf6" />
            <rect x="135" y="70" width="30" height="150" fill="#a855f7" />
            <rect x="175" y="90" width="30" height="130" fill="#d946ef" />
            <rect x="215" y="50" width="30" height="170" fill="#ec4899" />
            <rect x="255" y="120" width="30" height="100" fill="#f43f5e" />
          </svg>
        </div>
      `;
      
    case 'line':
      return `
        <div style="padding: 20px;">
          <svg width="100%" height="100%" viewBox="0 0 320 260">
            <!-- Title -->
            <text x="160" y="20" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>
            
            <!-- Y-axis -->
            <line x1="40" y1="40" x2="40" y2="220" stroke="gray" stroke-width="1" />
            <text x="35" y="50" text-anchor="end" font-size="12">100</text>
            <text x="35" y="90" text-anchor="end" font-size="12">80</text>
            <text x="35" y="130" text-anchor="end" font-size="12">60</text>
            <text x="35" y="170" text-anchor="end" font-size="12">40</text>
            <text x="35" y="210" text-anchor="end" font-size="12">20</text>
            
            <!-- X-axis -->
            <line x1="40" y1="220" x2="300" y2="220" stroke="gray" stroke-width="1" />
            <text x="70" y="235" text-anchor="middle" font-size="12">Jan</text>
            <text x="110" y="235" text-anchor="middle" font-size="12">Feb</text>
            <text x="150" y="235" text-anchor="middle" font-size="12">Mar</text>
            <text x="190" y="235" text-anchor="middle" font-size="12">Apr</text>
            <text x="230" y="235" text-anchor="middle" font-size="12">May</text>
            <text x="270" y="235" text-anchor="middle" font-size="12">Jun</text>
            
            <!-- Line -->
            <polyline
              points="70,100 110,130 150,70 190,90 230,50 270,120"
              fill="none"
              stroke="#4f46e5"
              stroke-width="3"
            />
            
            <!-- Data points -->
            <circle cx="70" cy="100" r="4" fill="#4f46e5" />
            <circle cx="110" cy="130" r="4" fill="#4f46e5" />
            <circle cx="150" cy="70" r="4" fill="#4f46e5" />
            <circle cx="190" cy="90" r="4" fill="#4f46e5" />
            <circle cx="230" cy="50" r="4" fill="#4f46e5" />
            <circle cx="270" cy="120" r="4" fill="#4f46e5" />
          </svg>
        </div>
      `;
      
    case 'funnel':
      return `
        <div style="padding: 20px;">
          <svg width="100%" height="100%" viewBox="0 0 320 260">
            <!-- Title -->
            <text x="160" y="20" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>
            
            <!-- Funnel -->
            <path d="M40,50 L280,50 L240,100 L80,100 Z" fill="#4f46e5" />
            <path d="M80,110 L240,110 L220,160 L100,160 Z" fill="#8b5cf6" />
            <path d="M100,170 L220,170 L200,220 L120,220 Z" fill="#d946ef" />
            
            <!-- Labels -->
            <text x="160" y="75" text-anchor="middle" font-size="14" fill="white">Visitors (1000)</text>
            <text x="160" y="135" text-anchor="middle" font-size="14" fill="white">Leads (450)</text>
            <text x="160" y="195" text-anchor="middle" font-size="14" fill="white">Sales (120)</text>
          </svg>
        </div>
      `;
    
    case 'scatter':
      return `
        <div style="padding: 20px;">
          <svg width="100%" height="100%" viewBox="0 0 320 260">
            <!-- Title -->
            <text x="160" y="20" text-anchor="middle" font-size="16" font-weight="bold">${title}</text>
            
            <!-- Y-axis -->
            <line x1="40" y1="40" x2="40" y2="220" stroke="gray" stroke-width="1" />
            <text x="35" y="50" text-anchor="end" font-size="12">100</text>
            <text x="35" y="90" text-anchor="end" font-size="12">80</text>
            <text x="35" y="130" text-anchor="end" font-size="12">60</text>
            <text x="35" y="170" text-anchor="end" font-size="12">40</text>
            <text x="35" y="210" text-anchor="end" font-size="12">20</text>
            
            <!-- X-axis -->
            <line x1="40" y1="220" x2="300" y2="220" stroke="gray" stroke-width="1" />
            <text x="70" y="235" text-anchor="middle" font-size="12">20</text>
            <text x="120" y="235" text-anchor="middle" font-size="12">40</text>
            <text x="170" y="235" text-anchor="middle" font-size="12">60</text>
            <text x="220" y="235" text-anchor="middle" font-size="12">80</text>
            <text x="270" y="235" text-anchor="middle" font-size="12">100</text>
            
            <!-- Data points -->
            <circle cx="70" cy="120" r="5" fill="#4f46e5" opacity="0.7" />
            <circle cx="110" cy="90" r="7" fill="#8b5cf6" opacity="0.7" />
            <circle cx="150" cy="180" r="4" fill="#a855f7" opacity="0.7" />
            <circle cx="190" cy="70" r="8" fill="#d946ef" opacity="0.7" />
            <circle cx="130" cy="150" r="6" fill="#ec4899" opacity="0.7" />
            <circle cx="220" cy="130" r="9" fill="#f43f5e" opacity="0.7" />
            <circle cx="250" cy="100" r="5" fill="#4f46e5" opacity="0.7" />
            <circle cx="90" cy="160" r="8" fill="#8b5cf6" opacity="0.7" />
            <circle cx="170" cy="110" r="7" fill="#a855f7" opacity="0.7" />
            <circle cx="260" cy="140" r="4" fill="#d946ef" opacity="0.7" />
          </svg>
        </div>
      `;
  }
};

export const mockCharts: ChartType[] = [
  {
    id: 'sales-by-region',
    name: 'Sales by Region',
    icon: <span className="text-blue-500">📊</span>,
    content: generateChartContent('pie', 'Sales by Region'),
    type: 'pie',
    layout: { i: 'sales-by-region', x: 0, y: 0, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'Which region performed the best last quarter?',
      'Are there any low-performing regions?'
    ]
  },
  {
    id: 'product-performance',
    name: 'Product Performance',
    icon: <span className="text-green-500">📈</span>,
    content: generateChartContent('bar', 'Product Performance'),
    type: 'bar',
    layout: { i: 'product-performance', x: 4, y: 0, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'Which product is generating the most revenue?',
      'Are there any products showing declining trends?'
    ]
  },
  {
    id: 'monthly-trends',
    name: 'Monthly Trends',
    icon: <span className="text-purple-500">📉</span>,
    content: generateChartContent('line', 'Monthly Trends'),
    type: 'line',
    layout: { i: 'monthly-trends', x: 8, y: 0, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'What are the key trends in the last 6 months?',
      'Is there seasonality in our business performance?'
    ]
  },
  {
    id: 'customer-segments',
    name: 'Customer Segments',
    icon: <span className="text-pink-500">🍩</span>,
    content: generateChartContent('pie', 'Customer Segments'),
    type: 'pie',
    layout: { i: 'customer-segments', x: 0, y: 10, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'What customer segment brings the most revenue?',
      'Should we focus more on enterprise or SMB customers?'
    ]
  },
  {
    id: 'conversion-funnel',
    name: 'Conversion Funnel',
    icon: <span className="text-yellow-500">🏗️</span>,
    content: generateChartContent('funnel', 'Conversion Funnel'),
    type: 'pie', // Using pie type since funnel isn't in the allowed types
    layout: { i: 'conversion-funnel', x: 4, y: 10, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'Where are we losing the most customers in the funnel?',
      'How can we improve our conversion rate?'
    ]
  },
  {
    id: 'growth-analysis',
    name: 'Growth Analysis',
    icon: <span className="text-red-500">📊</span>,
    content: generateChartContent('line', 'Growth Analysis'),
    type: 'line',
    layout: { i: 'growth-analysis', x: 8, y: 10, w: 4, h: 10, minW: 2, minH: 8 },
    askableQuestions: [
      'What is driving our current growth?',
      'How sustainable is our current growth trajectory?'
    ]
  }
];
