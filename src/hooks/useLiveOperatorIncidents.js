import { useState, useEffect, useCallback } from "react";
import { staffService } from "../services/staffService";

/**
 * Custom hook for real-time live incidents (Live Operator Dashboard)
 * Uses Firebase onSnapshot for instant updates - only charges when data changes
 *
 * Cost comparison:
 * - Polling every 30s: ~120 reads/hour per user
 * - onSnapshot: ~5-10 reads/hour (only when data changes)
 */
export function useLiveOperatorIncidents() {
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = staffService.subscribeLiveIncidents(
      (incidents) => {
        setLiveIncidents(incidents);
        setLoading(false);
      },
      (err) => {
        console.error("Error in live incidents subscription:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup: unsubscribe when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { liveIncidents, loading, error };
}

/**
 * Hook for paginated completed incidents - TRUE server-side pagination
 * Only reads `pageSize` documents at a time from Firebase (massive cost savings!)
 *
 * Example: 1000 completed incidents
 * - Old way: 1000 reads every time
 * - New way: 10 reads per page (only when user navigates)
 */
export function usePaginatedCompletedIncidentsForOperator(pageSize = 10) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [cursors, setCursors] = useState([]); // Store cursors for each page
  const [hasMore, setHasMore] = useState(true);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch total count once
  useEffect(() => {
    staffService.getCompletedIncidentsCount()
      .then(setTotalCount)
      .catch(console.error);
  }, []);

  // Fetch page data
  const fetchPage = useCallback(async (page) => {
    setLoading(true);
    setError(null);

    try {
      // Get cursor for previous page (or null for first page)
      const lastDoc = page > 1 ? cursors[page - 2] : null;

      const result = await staffService.getCompletedIncidentsPaginated(
        pageSize,
        lastDoc
      );

      setIncidents(result.incidents);
      setHasMore(result.hasMore);

      // Store cursor for this page
      if (result.lastDoc) {
        setCursors(prev => {
          const newCursors = [...prev];
          newCursors[page - 1] = result.lastDoc;
          return newCursors;
        });
      }
    } catch (err) {
      console.error("Error fetching paginated incidents:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [pageSize, cursors]);

  // Fetch first page on mount
  useEffect(() => {
    fetchPage(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation functions
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPage(nextPage);
    }
  }, [currentPage, totalPages, hasMore, fetchPage]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      fetchPage(prevPage);
    }
  }, [currentPage, fetchPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
    setCursors([]); // Reset cursors
    fetchPage(1);
  }, [fetchPage]);

  return {
    incidents,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    pageSize,
  };
}
