import { useState, useEffect, useCallback, useRef } from "react";
import { clientDataService } from "../services/clientDataService";
import { staffService } from "../services/staffService";

/**
 * Custom hook for real-time CCTV fault reports using Firebase onSnapshot.
 * Cost-effective: only charges when data actually changes (no polling).
 */
export function useLiveCCTVFaults(schemeId) {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!schemeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = clientDataService.subscribeCCTVFaults(
      schemeId,
      (data) => {
        setFaults(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error in CCTV faults subscription:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [schemeId]);

  return { faults, loading, error };
}

/**
 * Hook for paginated CCTV fault reports — true server-side pagination.
 * Only reads pageSize documents at a time from Firebase (cost savings).
 */
export function usePaginatedCCTVFaults(schemeId, pageSize = 10) {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [cursors, setCursors] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // Page cache: revisiting a page costs 0 reads
  const pageCacheRef = useRef({});

  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch total count once (1 aggregate read) — null means all schemes
  useEffect(() => {
    if (schemeId === undefined) return;
    clientDataService.getCCTVFaultsCount(schemeId)
      .then(setTotalCount)
      .catch(console.error);
  }, [schemeId]);

  const fetchPage = useCallback(async (page) => {
    if (schemeId === undefined) return;

    setError(null);

    // Cache hit — 0 reads
    const cached = pageCacheRef.current[page];
    if (cached) {
      setFaults(cached.faults);
      setHasMore(cached.hasMore);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const lastDoc = page > 1 ? cursors[page - 2] : null;

      const result = await clientDataService.getCCTVFaultsPaginated(
        schemeId,
        pageSize,
        lastDoc
      );

      setFaults(result.faults);
      setHasMore(result.hasMore);

      pageCacheRef.current[page] = {
        faults: result.faults,
        hasMore: result.hasMore,
      };

      if (result.lastDoc) {
        setCursors((prev) => {
          const next = [...prev];
          next[page - 1] = result.lastDoc;
          return next;
        });
      }
    } catch (err) {
      console.error("Error fetching paginated CCTV faults:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [schemeId, pageSize, cursors]);

  // Fetch first page on mount
  useEffect(() => {
    fetchPage(1);
  }, [schemeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages && hasMore) {
      const next = currentPage + 1;
      setCurrentPage(next);
      fetchPage(next);
    }
  }, [currentPage, totalPages, hasMore, fetchPage]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      fetchPage(prev);
    }
  }, [currentPage, fetchPage]);

  const refresh = useCallback(() => {
    setCurrentPage(1);
    setCursors([]);
    pageCacheRef.current = {};
    fetchPage(1);
    if (schemeId) {
      clientDataService.getCCTVFaultsCount(schemeId).then(setTotalCount).catch(console.error);
    }
  }, [fetchPage, schemeId]);

  return {
    faults,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasMore,
    goToNextPage,
    goToPrevPage,
    refresh,
    pageSize,
  };
}

/**
 * Staff-side hook for live CCTV faults.
 * Pass schemeScope array to scope the feed to the viewer's schemes (real staff →
 * internal schemes; TP staff → company schemes; demo → demo scheme).
 * Uses onSnapshot — free real-time updates, no polling.
 */
export function useStaffLiveCCTVFaults(schemeScope = null) {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stable key so useEffect only re-runs when the actual IDs change
  const schemeKey = schemeScope ? schemeScope.slice().sort().join(',') : null;

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = staffService.subscribeAllLiveCCTVFaults(
      (data) => {
        setFaults(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error in staff live CCTV faults subscription:", err);
        setError(err);
        setLoading(false);
      },
      schemeScope,
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [schemeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { faults, loading, error };
}
