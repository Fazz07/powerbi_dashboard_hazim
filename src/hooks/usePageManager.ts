// src/hooks/usePageManager.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
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
      'pbi-marketing-performance-visual'
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

  // Memoize currentPage to prevent unnecessary re-renders of components depending on it
  // and to ensure a stable reference for its 'layout' property.
  const currentPage = useMemo(() => {
    const page = pages.find(p => p.id === currentPageId);
    if (page) return page;
    // Fallback if currentPageId is invalid or page is not found (shouldn't happen often)
    console.warn(`[usePageManager] Current page with ID "${currentPageId}" not found. Falling back to default.`);
    return pages.length > 0 ? pages[0] : DEFAULT_PAGES[0];
  }, [pages, currentPageId]);

  // Effect to load initial currentPageId from localStorage
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

  const updatePageCharts = useCallback((pageId: string, chartIds: string[]) => {
    setPages(prev => prev.map(page =>
      page.id === pageId ? { ...page, charts: chartIds } : page
    ));
  }, []);

  // Memoize updatePageLayout to prevent unnecessary re-renders and ensure stable function reference
  const updatePageLayout = useCallback((pageId: string, layout: { lg: Layout[] }) => {
    setPages(prev => prev.map(page => {
      if (page.id === pageId) {
        // Perform a simple deep comparison to avoid unnecessary state updates if layout is identical
        const currentLayoutJson = JSON.stringify(page.layout);
        const newLayoutJson = JSON.stringify(layout);
        if (currentLayoutJson !== newLayoutJson) {
          console.log(`[usePageManager] Updating layout for page ${pageId}`);
          return { ...page, layout };
        } else {
          console.log(`[usePageManager] Layout for page ${pageId} is identical, skipping update.`);
        }
      }
      return page;
    }));
  }, []); // Empty dependency array ensures this callback is stable

  return {
    pages,
    currentPageId,
    setCurrentPageId,
    addPage,
    deletePage,
    updatePageCharts,
    updatePageLayout, // Export memoized function
    currentPage,      // Export memoized current page object
  };
};