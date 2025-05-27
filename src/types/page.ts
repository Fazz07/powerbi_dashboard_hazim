
export interface DashboardPage {
  id: string;
  name: string;
  charts: string[]; // Array of chart IDs
  layout?: { [key: string]: any }; // Store layout configuration per page
  isDefault?: boolean;
}

export interface PageContextType {
  pages: DashboardPage[];
  currentPageId: string;
  setCurrentPageId: (pageId: string) => void;
  addPage: (name: string) => void;
  deletePage: (pageId: string) => void;
  updatePageCharts: (pageId: string, chartIds: string[]) => void;
  updatePageLayout: (pageId: string, layout: any) => void;
}
