// src/hooks/usePageManager.ts
import { useState, useEffect } from 'react';
import { DashboardPage } from '@/types/page';
import { Layout } from 'react-grid-layout'; // Import Layout type for clarity

// Define a type for the setIsEditMode function
type SetIsEditMode = (value: boolean | ((prevState: boolean) => boolean)) => void;

const DEFAULT_PAGES: DashboardPage[] = [
  {
    id: 'finance',
    name: 'Finance',
    charts: [
      'overview-pbi-revenue-trends-visual',
      'pbi-store-breakdown-visual'
    ],
    isDefault: true,
    layout: {}
  },
  {
    id: 'hr',
    name: 'HR',
    charts: [
      'pbi-customer-demographics-visual',
      'conversion-funnel'
    ],
    isDefault: true,
    layout: {}
  },
  {
    id: 'operations',
    name: 'Operations',
    charts: [
      'overview-pbi-category-breakdown-visual',
      'pbi-marketing-performance-visual'
    ],
    isDefault: true,
    layout: {}
  },
  {
    id: 'overview',
    name: 'Overview',
    charts: [
      'conversion-funnel',
      'overview-pbi-category-breakdown-visual',
      'overview-pbi-revenue-trends-visual',
      'pbi-store-breakdown-visual',
      'pbi-customer-demographics-visual',
      'pbi-marketing-performance-visual'
    ],
    isDefault: true,
    layout: {}
  }
];

// Accept setIsEditMode as a parameter
export const usePageManager = (setIsEditMode: SetIsEditMode) => {
  const [pages, setPages] = useState<DashboardPage[]>(() => {
    try {
      const savedPages = localStorage.getItem('dashboard-pages');
      if (savedPages) {
        const parsedPages = JSON.parse(savedPages) as DashboardPage[];
        const ensuredPages = DEFAULT_PAGES.map(defaultPage => {
          const savedVersion = parsedPages.find(p => p.id === defaultPage.id);
          if (savedVersion) {
              const newChartsToAdd = defaultPage.charts.filter(
                  chartId => !savedVersion.charts.includes(chartId)
              );
              if (newChartsToAdd.length > 0) {
                  return { ...savedVersion, charts: [...savedVersion.charts, ...newChartsToAdd] };
              }
              return savedVersion;
          }
          return defaultPage;
        });
        parsedPages.forEach(savedPage => {
          if (!ensuredPages.some(p => p.id === savedPage.id)) {
            ensuredPages.push(savedPage);
          }
        });
        return ensuredPages;
      }
    } catch (err) {
      console.error('Failed to load saved pages, using defaults:', err);
    }
    return DEFAULT_PAGES;
  });
  const [currentPageId, setCurrentPageId] = useState('overview');

  useEffect(() => {
    const savedCurrentPageId = localStorage.getItem('dashboard-current-page-id');
    if (savedCurrentPageId && pages.some(p => p.id === savedCurrentPageId)) {
      setCurrentPageId(savedCurrentPageId);
    } else if (pages.length > 0) {
      setCurrentPageId(pages[0].id);
    }
  }, [pages]);

  useEffect(() => {
    try {
      localStorage.setItem('dashboard-pages', JSON.stringify(pages));
      localStorage.setItem('dashboard-current-page-id', currentPageId);
    } catch (err) {
      console.error('Failed to save pages or currentPageId:', err);
    }
  }, [pages, currentPageId]);

  const addPage = (name: string) => {
    const newPage: DashboardPage = {
      id: `page-${Date.now()}`,
      name,
      charts: [], // New pages start empty by default
      isDefault: false,
      layout: {} as { [key: string]: Layout[] } // Explicitly type layout
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newPage.id);
    setIsEditMode(true); // <--- Automatically turn on edit mode for new page
  };

  const deletePage = (pageId: string) => {
    const pageToDelete = pages.find(p => p.id === pageId);
    if (pageToDelete?.isDefault && pages.filter(p=>p.isDefault).length === 1) {
        console.warn("Cannot delete the last default page.");
        return;
    }

    setPages(prev => {
      const newPages = prev.filter(p => p.id !== pageId);
      if (currentPageId === pageId) {
        setCurrentPageId(newPages.length > 0 ? newPages[0].id : (DEFAULT_PAGES[0]?.id || 'overview'));
      }
      return newPages;
    });
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

  const getCurrentPage = () => {
    const page = pages.find(p => p.id === currentPageId);
    if (page) return page;
    if (pages.length > 0) {
        setCurrentPageId(pages[0].id);
        return pages[0];
    }
    return DEFAULT_PAGES[0];
  };

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