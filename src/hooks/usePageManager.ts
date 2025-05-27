
import { useState, useEffect } from 'react';
import { DashboardPage } from '@/types/page';

const DEFAULT_PAGES: DashboardPage[] = [
  { 
    id: 'finance', 
    name: 'Finance', 
    charts: ['sales-by-region', 'monthly-trends'], 
    isDefault: true,
    layout: {}
  },
  { 
    id: 'hr', 
    name: 'HR', 
    charts: ['customer-segments'], 
    isDefault: true,
    layout: {}
  },
  { 
    id: 'operations', 
    name: 'Operations', 
    charts: ['product-performance'], 
    isDefault: true,
    layout: {}
  },
  { 
    id: 'overview', 
    name: 'Overview', 
    charts: ['conversion-funnel', 'power-bi-report'], 
    isDefault: true,
    layout: {}
  }
];

export const usePageManager = () => {
  const [pages, setPages] = useState<DashboardPage[]>(DEFAULT_PAGES);
  const [currentPageId, setCurrentPageId] = useState('overview');

  // Load pages from localStorage
  useEffect(() => {
    try {
      const savedPages = localStorage.getItem('dashboard-pages');
      if (savedPages) {
        const parsedPages = JSON.parse(savedPages);
        setPages(parsedPages);
      }
    } catch (err) {
      console.error('Failed to load saved pages:', err);
    }
  }, []);

  // Save pages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dashboard-pages', JSON.stringify(pages));
    } catch (err) {
      console.error('Failed to save pages:', err);
    }
  }, [pages]);

  const addPage = (name: string) => {
    const newPage: DashboardPage = {
      id: `page-${Date.now()}`,
      name,
      charts: [], // Start with empty charts
      isDefault: false,
      layout: {} // Empty layout
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newPage.id);
  };

  const deletePage = (pageId: string) => {
    const pageToDelete = pages.find(p => p.id === pageId);
    if (pageToDelete?.isDefault) return; // Don't delete default pages
    
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (currentPageId === pageId) {
      setCurrentPageId(pages[0]?.id || 'overview');
    }
  };

  const updatePageCharts = (pageId: string, chartIds: string[]) => {
    setPages(prev => prev.map(page => 
      page.id === pageId ? { ...page, charts: chartIds } : page
    ));
  };

  const updatePageLayout = (pageId: string, layout: any) => {
    setPages(prev => prev.map(page => 
      page.id === pageId ? { ...page, layout } : page
    ));
  };

  const getCurrentPage = () => pages.find(p => p.id === currentPageId) || pages[0];

  return {
    pages,
    currentPageId,
    setCurrentPageId,
    addPage,
    deletePage,
    updatePageCharts,
    updatePageLayout,
    getCurrentPage
  };
};
