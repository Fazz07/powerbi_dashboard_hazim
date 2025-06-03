// src/hooks/usePageManager.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardPage } from '@/types/page';
import { Layout } from 'react-grid-layout'; 
import { fetchUserDashboardCustomization, saveUserDashboardCustomization } from '@/services/dashboardService'; // NEW IMPORT
import { useToast } from '@/hooks/use-toast'; // To display errors

type SetIsEditMode = (value: boolean | ((prevState: boolean) => boolean)) => void;

// Define default pages that *always* exist as a fallback and base structure.
// These are not loaded/saved from backend, but act as a fallback and base structure.
const DEFAULT_FALLBACK_PAGES: DashboardPage[] = [
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
    layout: { lg: [] } // Ensure layout is initialized for RGL
  },
  {
    id: 'finance',
    name: 'Finance',
    charts: [
      'overview-pbi-revenue-trends-visual',
      'pbi-store-breakdown-visual'
    ],
    isDefault: true,
    layout: { lg: [] }
  },
  {
    id: 'hr',
    name: 'HR',
    charts: [
      'pbi-customer-demographics-visual',
      'pbi-marketing-performance-visual'
    ],
    isDefault: true,
    layout: { lg: [] }
  },
  {
    id: 'operations',
    name: 'Operations',
    charts: [
      'overview-pbi-category-breakdown-visual',
      'pbi-marketing-performance-visual'
    ],
    isDefault: true,
    layout: { lg: [] }
  }
];

export const usePageManager = (setIsEditMode: SetIsEditMode) => {
  // Initialize pages as empty; they will be populated by the first useEffect call.
  const [pages, setPages] = useState<DashboardPage[]>([]); 
  const [currentPageId, setCurrentPageId] = useState('overview');
  const { toast } = useToast();

  // Flag to indicate if pages have been loaded from the backend for the first time.
  // This prevents saving default pages back to the DB immediately on component mount.
  const [hasLoadedFromBackend, setHasLoadedFromBackend] = useState(false);


  // Effect to load pages from the backend on component mount.
  useEffect(() => {
    const loadPages = async () => {
      try {
        const fetchedPages = await fetchUserDashboardCustomization();
        let combinedPages: DashboardPage[] = [];

        // Create a map for quick lookup of fetched pages by their ID.
        const fetchedPageMap = new Map(fetchedPages.map(p => [p.id, p]));

        // Process default fallback pages first.
        DEFAULT_FALLBACK_PAGES.forEach(defaultPage => {
          if (fetchedPageMap.has(defaultPage.id)) {
            // If fetched data exists for this default page ID, merge it.
            const fetched = fetchedPageMap.get(defaultPage.id)!;
            // Ensure all default charts are present, but also include any charts from fetched data.
            const mergedCharts = Array.from(new Set([...defaultPage.charts, ...fetched.charts]));
            combinedPages.push({
              ...fetched, // Use fetched properties (name, layout, etc.)
              name: fetched.name || defaultPage.name, // Prefer fetched name, fallback to default
              charts: mergedCharts,
              isDefault: true, // Always mark these specific IDs as default
              layout: fetched.layout || { lg: [] }, // Ensure layout is initialized
            });
            fetchedPageMap.delete(defaultPage.id); // Mark as processed from fetched data
          } else {
            // If a default page was NOT fetched (e.g., new user, DB reset), add it from the fallback.
            combinedPages.push({ ...defaultPage }); 
          }
        });

        // Add any remaining custom pages that were fetched but are not part of `DEFAULT_FALLBACK_PAGES`.
        fetchedPageMap.forEach(customPage => {
          combinedPages.push({
            ...customPage,
            isDefault: customPage.isDefault || false, // Ensure `isDefault` is set, prefer fetched value
            layout: customPage.layout || { lg: [] }, // Ensure layout is initialized
          });
        });

        // If, after merging, no pages exist (e.g., database is empty and `DEFAULT_FALLBACK_PAGES` was somehow empty),
        // fallback to the hardcoded defaults. (This scenario is unlikely with `DEFAULT_FALLBACK_PAGES` defined).
        if (combinedPages.length === 0) {
            combinedPages = DEFAULT_FALLBACK_PAGES.map(p => ({...p})); 
        }

        setPages(combinedPages);

        // Set the current page ID:
        // 1. Try to use the last saved current page ID from localStorage.
        // 2. If not found or invalid, use the ID of the first available page.
        // 3. Fallback to 'overview' if no pages are available.
        const savedCurrentPageId = localStorage.getItem('dashboard-current-page-id');
        if (savedCurrentPageId && combinedPages.some(p => p.id === savedCurrentPageId)) {
          setCurrentPageId(savedCurrentPageId);
        } else if (combinedPages.length > 0) {
          setCurrentPageId(combinedPages[0].id);
        } else {
            setCurrentPageId('overview'); 
        }
      } catch (err) {
        console.error('Failed to load pages from backend, using defaults:', err);
        toast({
          title: "Loading Error",
          description: "Failed to load your custom dashboard pages. Using default configuration.",
          variant: "destructive",
        });
        // On error, revert to hardcoded defaults and 'overview' page.
        setPages(DEFAULT_FALLBACK_PAGES.map(p => ({...p}))); 
        setCurrentPageId('overview'); 
      } finally {
        setHasLoadedFromBackend(true); // Mark that initial load is complete, allowing saves now.
      }
    };

    loadPages();
  }, []); // Empty dependency array ensures this runs only once on mount.

  // Effect to save pages to the backend whenever `pages` or `currentPageId` changes.
  // This save operation is debounced to prevent excessive writes on rapid state updates (e.g., dragging charts).
  useEffect(() => {
    // Only save after the initial load from the backend has completed.
    if (!hasLoadedFromBackend) {
      console.log('[usePageManager] Skipping save: Initial load from backend not complete.');
      return;
    }

    const savePages = async () => {
      try {
        await saveUserDashboardCustomization(pages);
        // Keep current page ID in localStorage for quick access on next session.
        localStorage.setItem('dashboard-current-page-id', currentPageId); 
        console.log(`[usePageManager] Pages and currentPageId saved to Cosmos DB. Current Pages:`, pages);
      } catch (err) {
        console.error('Failed to save pages to Cosmos DB:', err);
        toast({
          title: "Save Error",
          description: "Failed to save your dashboard customization.",
          variant: "destructive",
        });
      }
    };
    
    // Debounce the save operation.
    const handler = setTimeout(() => {
      savePages();
    }, 500); // Saves after 500ms of inactivity.

    return () => {
      clearTimeout(handler); // Clear timeout if dependencies change before save triggers.
    };
  }, [pages, currentPageId, hasLoadedFromBackend, toast]);


  // Memoized `currentPage` for efficient access to the currently active page object.
  const currentPage = useMemo(() => {
    const page = pages.find(p => p.id === currentPageId);
    if (page) return page;
    console.warn(`[usePageManager] Current page with ID "${currentPageId}" not found. Falling back to default.`);
    // Fallback to the first default page if the current page is not found.
    return pages.length > 0 ? pages[0] : DEFAULT_FALLBACK_PAGES[0];
  }, [pages, currentPageId]);

  // Function to add a new custom dashboard page.
  const addPage = (name: string) => {
    const newPage: DashboardPage = {
      id: `page-${Date.now()}`, // Unique ID for the new page
      name,
      charts: [], 
      isDefault: false, // Custom pages are not default
      layout: { lg: [] } as { [key: string]: Layout[] } // Initialize with empty layout
    };
    setPages(prev => [...prev, newPage]); // Add to the end of the pages list
    setCurrentPageId(newPage.id); // Set the new page as the current page
    setIsEditMode(true); // Automatically switch to edit mode for new pages
  };

  // Function to delete a dashboard page.
  const deletePage = (pageId: string) => {
    setPages(prev => {
      const pageToDelete = prev.find(p => p.id === pageId);

      // Determine the count of default pages.
      const defaultPagesCount = prev.filter(p => p.isDefault).length;

      // Prevent deletion of a default page if it's the *only* remaining default page.
      if (pageToDelete?.isDefault && defaultPagesCount <= 1) {
          toast({
            title: "Cannot Delete",
            description: "You cannot delete the last default dashboard page.",
            variant: "destructive",
          });
          return prev; // Return previous state to prevent deletion
      }

      const newPages = prev.filter(p => p.id !== pageId); // Filter out the deleted page
      if (currentPageId === pageId) {
        // If the current page is deleted, navigate to the first available page,
        // prioritizing default pages if available, or 'overview' fallback.
        setCurrentPageId(newPages.length > 0 ? newPages[0].id : (DEFAULT_FALLBACK_PAGES[0]?.id || 'overview'));
      }
      return newPages;
    });
  };

  // Callback to update the list of chart IDs for a specific page.
  const updatePageCharts = useCallback((pageId: string, chartIds: string[]) => {
    setPages(prev => prev.map(page =>
      page.id === pageId ? { ...page, charts: chartIds } : page
    ));
  }, []);

  // Callback to update the layout configuration for a specific page.
  const updatePageLayout = useCallback((pageId: string, layout: { lg: Layout[] }) => {
    setPages(prev => prev.map(page => {
      if (page.id === pageId) {
        const currentLayoutJson = JSON.stringify(page.layout);
        const newLayoutJson = JSON.stringify(layout);
        // Only update if the layout has actually changed to prevent unnecessary re-renders/saves.
        if (currentLayoutJson !== newLayoutJson) {
          console.log(`[usePageManager] Updating layout for page ${pageId}`);
          return { ...page, layout };
        } else {
          console.log(`[usePageManager] Layout for page ${pageId} is identical, skipping state update.`);
        }
      }
      return page;
    }));
  }, []); 

  // Return the state and functions provided by the hook.
  return {
    pages,
    currentPageId,
    setCurrentPageId,
    addPage,
    deletePage,
    updatePageCharts,
    updatePageLayout, 
    currentPage,      
  };
};