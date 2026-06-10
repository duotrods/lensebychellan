import { createContext, useContext } from "react";
import { useStaffLiveCCTVFaults } from "../hooks/useCCTVFaults";

const StaffCCTVFaultsContext = createContext({ faults: [], loading: true, error: null });

/**
 * Provides a single shared onSnapshot subscription for live CCTV faults.
 * Wrap StaffSidebarLayout's children with this so the sidebar badge and
 * CCTVFaultsLivePage both consume from ONE listener instead of two identical ones.
 */
export const StaffCCTVFaultsProvider = ({ children, schemeScope = null }) => {
  const value = useStaffLiveCCTVFaults(schemeScope);
  return (
    <StaffCCTVFaultsContext.Provider value={value}>
      {children}
    </StaffCCTVFaultsContext.Provider>
  );
};

export const useStaffCCTVFaultsContext = () => useContext(StaffCCTVFaultsContext);
