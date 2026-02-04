import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { AppError } from "../utils/errorHandling";

class ClientDataService {
  // Get live incidents for a specific scheme
  async getLiveIncidentsByScheme(schemeId) {
    try {
      const incidentsRef = collection(db, "incidentReports");

      try {
        // Try compound query (requires index on schemeIds + status + createdAt)
        const q = query(
          incidentsRef,
          where("schemeIds", "array-contains", schemeId),
          where("status", "==", "live"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (indexError) {
        // If index doesn't exist, fall back to fetching by scheme and filtering in memory
        if (
          indexError.code === "failed-precondition" ||
          indexError.message?.includes("index")
        ) {
          console.warn(
            "Index not available for live incidents query, filtering in memory"
          );
          const simpleQuery = query(
            incidentsRef,
            where("schemeIds", "array-contains", schemeId)
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((doc) => doc.status === "live")
            .sort((a, b) => {
              const timeA = a.createdAt?.seconds || 0;
              const timeB = b.createdAt?.seconds || 0;
              return timeB - timeA;
            });
          return docs;
        }
        throw indexError;
      }
    } catch (error) {
      console.error("Error fetching live incidents:", error);
      throw new AppError(
        "Failed to fetch live incidents",
        "client-data/fetch-error",
        error
      );
    }
  }

  // Get incidents for a specific scheme
  async getSchemeIncidents(schemeId, limitCount = 100) {
    try {
      const incidentsRef = collection(db, "incidentReports");

      // Try new schema first (schemeIds array)
      try {
        const q = query(
          incidentsRef,
          where("schemeIds", "array-contains", schemeId),
          orderBy("createdAt", "desc"),
          limit(limitCount),
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(
          `Found ${results.length} incidents for scheme ${schemeId} using array-contains`,
        );
        return results;
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (
          indexError.code === "failed-precondition" ||
          indexError.message?.includes("index")
        ) {
          // If index doesn't exist, try without ordering
          console.warn(
            "Index not available for incidentReports, trying simplified query",
          );
          const simpleQuery = query(
            incidentsRef,
            where("schemeIds", "array-contains", schemeId),
            limit(limitCount),
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log(
            `Found ${docs.length} incidents for scheme ${schemeId} (simplified query)`,
          );
          if (docs.length > 0) {
            console.log(
              "Sample incident schemeIds:",
              docs[0].schemeIds,
              "Sample incident data:",
              docs[0],
            );
          }
          // Sort in memory
          return docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        // If it's a permissions error or other error, rethrow
        throw indexError;
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
      throw new AppError(
        "Failed to fetch scheme incidents",
        "client-data/fetch-error",
        error,
      );
    }
  }

  // Get CCTV check reports for a specific scheme
  async getSchemeCCTVChecks(schemeId, limitCount = 100) {
    try {
      const cctvRef = collection(db, "cctvCheckForms");

      try {
        const q = query(
          cctvRef,
          where("schemeIds", "array-contains", schemeId),
          orderBy("createdAt", "desc"),
          limit(limitCount),
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (
          indexError.code === "failed-precondition" ||
          indexError.message?.includes("index")
        ) {
          console.warn(
            "Index not available for cctvCheckForms, trying simplified query",
          );
          const simpleQuery = query(
            cctvRef,
            where("schemeIds", "array-contains", schemeId),
            limit(limitCount),
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          return docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        throw indexError;
      }
    } catch (error) {
      console.error("Error fetching CCTV checks:", error);
      throw new AppError(
        "Failed to fetch CCTV checks",
        "client-data/fetch-error",
        error,
      );
    }
  }

  // Get daily occurrence logs for a specific scheme
  async getSchemeDailyLogs(schemeId, limitCount = 100) {
    try {
      const logsRef = collection(db, "dailyOccurrenceReports");

      try {
        const q = query(
          logsRef,
          where("schemeIds", "array-contains", schemeId),
          orderBy("createdAt", "desc"),
          limit(limitCount),
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (
          indexError.code === "failed-precondition" ||
          indexError.message?.includes("index")
        ) {
          console.warn(
            "Index not available for dailyOccurrenceReports, trying simplified query",
          );
          const simpleQuery = query(
            logsRef,
            where("schemeIds", "array-contains", schemeId),
            limit(limitCount),
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          return docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        throw indexError;
      }
    } catch (error) {
      console.error("Error fetching daily logs:", error);
      throw new AppError(
        "Failed to fetch daily logs",
        "client-data/fetch-error",
        error,
      );
    }
  }

  // Get aggregated statistics for a scheme
  async getSchemeStats(schemeId, days = 30) {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Get recent incidents
      const incidentsRef = collection(db, "incidentReports");
      const incidentsQuery = query(
        incidentsRef,
        where("schemeIds", "array-contains", schemeId),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
      );
      const incidentsSnapshot = await getDocs(incidentsQuery);
      const incidents = incidentsSnapshot.docs.map((doc) => doc.data());

      // Calculate statistics
      const stats = {
        totalIncidents: incidents.length,
        incidentsByType: this.groupByField(incidents, "incidentType"),
        incidentsByLane: this.groupByFieldArray(incidents, "affectedLanes"), // Array field
        vehiclesDispatched: this.calculateVehiclesDispatched(incidents),
        spottedBy: this.groupByField(incidents, "reportedBy"), // Changed from spottedBy to reportedBy
        faultTypes: this.groupByField(incidents, "fault"), // Changed from faultType to fault
        vehicleTypes: this.groupVehicleTypes(incidents), // Extract from vehicles array
        vehicleTypesDispatched: this.groupVehiclesDispatched(incidents), // From recoveryRequested object
        trafficConditions: this.groupByField(incidents, "trafficConditions"),
        trackOfIncident: this.groupByField(incidents, "track"),
        emergencyServices: this.groupByFieldArray(
          incidents,
          "emergencyServices",
        ), // Array field
        timeToRecover: this.groupByCalculatedTime(
          incidents,
          "timeOnsiteToCleared",
        ), // Time from on site to cleared (pre-calculated)
        timeToSite: this.groupByCalculatedTime(incidents, "timeSpottedToOn"), // Time from spotted to on site (pre-calculated)
        incursions: incidents.filter((i) => i.incursion === "YES").length, // Check for 'YES' string
        recentIncidents: incidents.slice(0, 10).map((incident) => ({
          type: incident.incidentType || "Unknown",
          location: incident.markerPost || incident.section || "Unknown",
          time: incident.createdAt,
          status: incident.status || "Resolved",
        })),
      };

      return stats;
    } catch (error) {
      throw new AppError(
        "Failed to fetch scheme stats",
        "client-data/stats-error",
        error,
      );
    }
  }

  // Helper function to calculate time difference between two time fields and group by ranges
  // Takes two time fields (in HH:MM format) and calculates the difference in minutes
  groupByTimeDifference(data, startTimeField, endTimeField) {
    const ranges = {
      "Under 10": 0,
      "10-20": 0,
      "20-30": 0,
      "30-45": 0,
      "45-1 hour": 0,
      "Over 1 hour": 0,
    };

    data.forEach((item) => {
      const startTime = item[startTimeField];
      const endTime = item[endTimeField];

      // Both times must exist
      if (startTime && endTime && startTime !== "" && endTime !== "") {
        // Convert time strings (HH:MM) to minutes since midnight
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);

        if (startMinutes !== null && endMinutes !== null) {
          // Calculate difference
          let diffMinutes = endMinutes - startMinutes;

          // Handle case where end time is past midnight
          if (diffMinutes < 0) {
            diffMinutes += 24 * 60; // Add 24 hours
          }

          // Group by ranges
          if (diffMinutes > 0) {
            if (diffMinutes < 10) ranges["Under 10"]++;
            else if (diffMinutes < 20) ranges["10-20"]++;
            else if (diffMinutes < 30) ranges["20-30"]++;
            else if (diffMinutes < 45) ranges["30-45"]++;
            else if (diffMinutes < 60) ranges["45-1 hour"]++;
            else ranges["Over 1 hour"]++;
          }
        }
      }
    });

    return ranges;
  }

  // Helper function to convert time string (HH:MM) to minutes since midnight
  timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return null;

    const parts = timeStr.split(":");
    if (parts.length !== 2) return null;

    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);

    if (isNaN(hours) || isNaN(minutes)) return null;

    return hours * 60 + minutes;
  }

  // Helper function to group pre-calculated time fields (e.g., "25 mins", "65 mins")
  // This matches the logic used in admin ClientChartsPage.jsx
  groupByCalculatedTime(data, field) {
    // Determine which bucket ranges to use based on the field
    const isTimeToSite = field === "timeSpottedToOn";

    const ranges = isTimeToSite
      ? { "0-5": 0, "6-10": 0, "11-15": 0, "16-20": 0, "20+": 0 }
      : { "0-15": 0, "16-30": 0, "31-45": 0, "46-60": 0, "60+": 0 };

    data.forEach((item) => {
      const timeValue = item[field];

      // Parse the pre-calculated time string (e.g., "25 mins" -> 25)
      if (timeValue) {
        const match = timeValue.match(/(\d+)/);
        if (match) {
          const mins = parseInt(match[1]);

          if (isTimeToSite) {
            // Time to Site buckets
            if (mins <= 5) ranges["0-5"]++;
            else if (mins <= 10) ranges["6-10"]++;
            else if (mins <= 15) ranges["11-15"]++;
            else if (mins <= 20) ranges["16-20"]++;
            else ranges["20+"]++;
          } else {
            // Time to Recover buckets
            if (mins <= 15) ranges["0-15"]++;
            else if (mins <= 30) ranges["16-30"]++;
            else if (mins <= 45) ranges["31-45"]++;
            else if (mins <= 60) ranges["46-60"]++;
            else ranges["60+"]++;
          }
        }
      }
    });

    return ranges;
  }

  // Helper function to group time data by ranges (legacy - for backward compatibility)
  // Converts time strings (HH:MM format) to minutes and groups them
  groupByTimeRange(data, field) {
    const ranges = {
      "Under 10": 0,
      "10-20": 0,
      "20-30": 0,
      "30-45": 0,
      "45-1 hour": 0,
      "Over 1 hour": 0,
    };

    data.forEach((item) => {
      const timeValue = item[field];
      if (timeValue !== undefined && timeValue !== null && timeValue !== "") {
        let minutes = 0;

        // If it's a number, use it directly
        if (typeof timeValue === "number") {
          minutes = timeValue;
        }
        // If it's a time string like "HH:MM", convert to minutes
        else if (typeof timeValue === "string" && timeValue.includes(":")) {
          const [hours, mins] = timeValue.split(":").map(Number);
          minutes = hours * 60 + (mins || 0);
        }
        // If it's just a string number
        else if (typeof timeValue === "string") {
          minutes = parseInt(timeValue) || 0;
        }

        // Group by ranges
        if (minutes > 0) {
          if (minutes < 10) ranges["Under 10"]++;
          else if (minutes < 20) ranges["10-20"]++;
          else if (minutes < 30) ranges["20-30"]++;
          else if (minutes < 45) ranges["30-45"]++;
          else if (minutes < 60) ranges["45-1 hour"]++;
          else ranges["Over 1 hour"]++;
        }
      }
    });

    return ranges;
  }

  // Helper function to group data by field
  groupByField(data, field) {
    const grouped = {};
    data.forEach((item) => {
      const value = item[field] || "Unknown";
      grouped[value] = (grouped[value] || 0) + 1;
    });
    return grouped;
  }

  // Helper function to group data by array field (like affectedLanes, emergencyServices)
  groupByFieldArray(data, field) {
    const grouped = {};
    data.forEach((item) => {
      const values = item[field];
      if (Array.isArray(values) && values.length > 0) {
        values.forEach((value) => {
          grouped[value] = (grouped[value] || 0) + 1;
        });
      }
    });
    return grouped;
  }

  // Helper to extract vehicle types from vehicles array
  groupVehicleTypes(data) {
    const grouped = {};
    data.forEach((item) => {
      const vehicles = item.vehicles;
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        vehicles.forEach((vehicle) => {
          if (vehicle.type) {
            grouped[vehicle.type] = (grouped[vehicle.type] || 0) + 1;
          }
        });
      }
    });
    return grouped;
  }

  // Helper to group vehicles dispatched from recoveryRequested object
  groupVehiclesDispatched(data) {
    const totals = {
      Light: 0,
      Heavy: 0,
      IPV: 0,
      HETOS: 0,
    };

    data.forEach((item) => {
      const recovery = item.recoveryRequested;
      if (recovery && typeof recovery === "object") {
        totals.Light += recovery.light || 0;
        totals.Heavy += recovery.heavy || 0;
        totals.IPV += recovery.ipv || 0;
        totals.HETOS += recovery.hetos || 0;
      }
    });

    return totals;
  }

  // Calculate total vehicles dispatched
  calculateVehiclesDispatched(data) {
    let total = 0;
    data.forEach((item) => {
      const recovery = item.recoveryRequested;
      if (recovery && typeof recovery === "object") {
        total +=
          (recovery.light || 0) +
          (recovery.heavy || 0) +
          (recovery.ipv || 0) +
          (recovery.hetos || 0);
      }
    });
    return total;
  }

  // Get CCTV uptime statistics
  async getCCTVUptime(schemeId) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const cctvRef = collection(db, "cctvCheckForms");
      const q = query(
        cctvRef,
        where("schemeIds", "array-contains", schemeId),
        where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
      );

      const querySnapshot = await getDocs(q);
      const checks = querySnapshot.docs.map((doc) => doc.data());

      if (checks.length === 0) {
        return { uptime: 0, totalChecks: 0 };
      }

      const workingChecks = checks.filter(
        (check) => check.status === "operational" || check.allWorking === true,
      );
      const uptime = ((workingChecks.length / checks.length) * 100).toFixed(1);

      return {
        uptime: parseFloat(uptime),
        totalChecks: checks.length,
        workingChecks: workingChecks.length,
      };
    } catch (error) {
      console.error("Failed to fetch CCTV uptime:", error);
      return { uptime: 0, totalChecks: 0 };
    }
  }

  // Get time-series data for charts
  async getTimeSeriesData(schemeId, days = 30) {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const incidentsRef = collection(db, "incidentReports");
      const q = query(
        incidentsRef,
        where("schemeIds", "array-contains", schemeId),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        orderBy("createdAt", "asc"),
      );

      const querySnapshot = await getDocs(q);
      const incidents = querySnapshot.docs.map((doc) => doc.data());

      // Group by week
      const weeklyData = {};
      incidents.forEach((incident) => {
        const date = incident.createdAt.toDate();
        const weekKey = `Week ${this.getWeekNumber(date)}`;

        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      });

      return Object.entries(weeklyData).map(([name, count]) => ({
        name,
        count,
      }));
    } catch (error) {
      console.error("Failed to fetch time series data:", error);
      return [];
    }
  }

  // Helper: Get week start date
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // Helper: Get week number
  getWeekNumber(date) {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  // Get aggregated statistics for a scheme by date range
  async getSchemeStatsByDateRange(schemeId, startDateStr, endDateStr) {
    try {
      // Convert date strings (YYYY-MM-DD) to Date objects
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0); // Start of day

      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999); // End of day

      // Get recent incidents
      const incidentsRef = collection(db, "incidentReports");
      let incidents = [];

      try {
        // Try compound query with date range (requires index)
        const incidentsQuery = query(
          incidentsRef,
          where("schemeIds", "array-contains", schemeId),
          where("createdAt", ">=", Timestamp.fromDate(startDate)),
          where("createdAt", "<=", Timestamp.fromDate(endDate)),
        );
        const incidentsSnapshot = await getDocs(incidentsQuery);
        incidents = incidentsSnapshot.docs.map((doc) => doc.data());
        console.log(
          `Found ${incidents.length} incidents for scheme ${schemeId} in date range`,
        );
      } catch (indexError) {
        // If index doesn't exist, fall back to fetching all and filtering in memory
        if (
          indexError.code === "failed-precondition" ||
          indexError.message?.includes("index")
        ) {
          console.warn(
            "Index not available for date range query, filtering in memory",
          );
          const simpleQuery = query(
            incidentsRef,
            where("schemeIds", "array-contains", schemeId),
          );
          const snapshot = await getDocs(simpleQuery);
          const allIncidents = snapshot.docs.map((doc) => doc.data());

          // Filter by date range in memory
          incidents = allIncidents.filter((incident) => {
            if (!incident.createdAt) return false;
            const incidentDate = incident.createdAt.toDate();
            return incidentDate >= startDate && incidentDate <= endDate;
          });
          console.log(
            `Filtered ${incidents.length} incidents from ${allIncidents.length} total for scheme ${schemeId}`,
          );
        } else {
          throw indexError;
        }
      }

      // Calculate statistics (same as getSchemeStats)
      const stats = {
        totalIncidents: incidents.length,
        incidentsByType: this.groupByField(incidents, "incidentType"),
        incidentsByLane: this.groupByFieldArray(incidents, "affectedLanes"),
        vehiclesDispatched: this.calculateVehiclesDispatched(incidents),
        spottedBy: this.groupByField(incidents, "reportedBy"),
        faultTypes: this.groupByField(incidents, "fault"),
        vehicleTypes: this.groupVehicleTypes(incidents),
        vehicleTypesDispatched: this.groupVehiclesDispatched(incidents),
        trafficConditions: this.groupByField(incidents, "trafficConditions"),
        trackOfIncident: this.groupByField(incidents, "track"),
        emergencyServices: this.groupByFieldArray(
          incidents,
          "emergencyServices",
        ),
        timeToRecover: this.groupByCalculatedTime(
          incidents,
          "timeOnsiteToCleared",
        ),
        timeToSite: this.groupByCalculatedTime(incidents, "timeSpottedToOn"),
        incursions: incidents.filter((i) => i.incursion === "YES").length,
        recentIncidents: incidents.slice(0, 10).map((incident) => ({
          type: incident.incidentType || "Unknown",
          location: incident.markerPost || incident.section || "Unknown",
          time: incident.createdAt,
          status: incident.status || "Resolved",
        })),
      };

      return stats;
    } catch (error) {
      throw new AppError(
        "Failed to fetch scheme stats by date range",
        "client-data/stats-error",
        error,
      );
    }
  }

  // Get time series data by date range
  async getTimeSeriesDataByDateRange(schemeId, startDateStr, endDateStr) {
    try {
      // Convert date strings (YYYY-MM-DD) to Date objects
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);

      const incidentsRef = collection(db, "incidentReports");
      let incidents = [];

      try {
        // Try compound query with date range and ordering (requires index)
        const q = query(
          incidentsRef,
          where("schemeIds", "array-contains", schemeId),
          where("createdAt", ">=", Timestamp.fromDate(startDate)),
          where("createdAt", "<=", Timestamp.fromDate(endDate)),
          orderBy("createdAt", "asc"),
        );
        const querySnapshot = await getDocs(q);
        incidents = querySnapshot.docs.map((doc) => doc.data());
      } catch (indexError) {
        // If index doesn't exist, fall back to fetching all and filtering in memory
        if (
          indexError.code === "failed-precondition" ||
          indexError.message?.includes("index")
        ) {
          console.warn(
            "Index not available for time series query, filtering in memory",
          );
          const simpleQuery = query(
            incidentsRef,
            where("schemeIds", "array-contains", schemeId),
          );
          const snapshot = await getDocs(simpleQuery);
          const allIncidents = snapshot.docs.map((doc) => doc.data());

          // Filter by date range and sort in memory
          incidents = allIncidents
            .filter((incident) => {
              if (!incident.createdAt) return false;
              const incidentDate = incident.createdAt.toDate();
              return incidentDate >= startDate && incidentDate <= endDate;
            })
            .sort((a, b) => {
              const timeA = a.createdAt?.seconds || 0;
              const timeB = b.createdAt?.seconds || 0;
              return timeA - timeB;
            });
        } else {
          throw indexError;
        }
      }

      // Group by month (e.g., "January 2026")
      const monthlyData = {};
      const monthOrder = []; // Track order of months for sorting
      incidents.forEach((incident) => {
        const date = incident.createdAt.toDate();
        const monthKey = date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = 0;
          monthOrder.push({
            key: monthKey,
            date: new Date(date.getFullYear(), date.getMonth(), 1),
          });
        }
        monthlyData[monthKey]++;
      });

      // Sort by date and return
      monthOrder.sort((a, b) => a.date - b.date);
      return monthOrder.map(({ key }) => ({
        name: key,
        count: monthlyData[key],
      }));
    } catch (error) {
      console.error("Failed to fetch time series data by date range:", error);
      return [];
    }
  }

  // Get all reports for a specific scheme (combines all report types)
  async getAllReports(schemeId) {
    try {
      // Fetch each report type separately with error handling
      const incidents = await this.getSchemeIncidents(schemeId).catch((err) => {
        console.error("Failed to fetch incidents:", err);
        return [];
      });

      const assetDamage = await this.getSchemeAssetDamage(schemeId).catch(
        (err) => {
          console.error("Failed to fetch asset damage:", err);
          return [];
        },
      );

      const dailyLogs = await this.getSchemeDailyLogs(schemeId).catch((err) => {
        console.error("Failed to fetch daily logs:", err);
        return [];
      });

      const cctvChecks = await this.getSchemeCCTVChecks(schemeId).catch(
        (err) => {
          console.error("Failed to fetch CCTV checks:", err);
          return [];
        },
      );

      // Transform and combine all reports
      const allReports = [
        ...incidents.map((report) => ({
          ...report,
          reportType: "incident",
          type: report.incidentType,
          timestamp: report.createdAt,
        })),
        ...assetDamage.map((report) => ({
          ...report,
          reportType: "asset-damage",
          type: report.damageType,
          timestamp: report.createdAt,
        })),
        ...dailyLogs.map((report) => ({
          ...report,
          reportType: "daily-occurrence",
          title: report.title || "Daily Log",
          timestamp: report.createdAt,
        })),
        ...cctvChecks.map((report) => ({
          ...report,
          reportType: "cctv-check",
          title: "CCTV Check",
          timestamp: report.createdAt,
        })),
      ];

      // Sort by timestamp (newest first)
      return allReports.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error("Error in getAllReports:", error);
      throw new AppError(
        "Failed to fetch all reports",
        "client-data/reports-error",
        error,
      );
    }
  }

  // Get asset damage reports for a specific scheme
  async getSchemeAssetDamage(schemeId, limitCount = 100) {
    try {
      const damageRef = collection(db, "assetDamageReports");

      try {
        const q = query(
          damageRef,
          where("schemeIds", "array-contains", schemeId),
          orderBy("createdAt", "desc"),
          limit(limitCount),
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (
          indexError.code === "failed-precondition" ||
          indexError.message?.includes("index")
        ) {
          console.warn(
            "Index not available for assetDamageReports, trying simplified query",
          );
          const simpleQuery = query(
            damageRef,
            where("schemeIds", "array-contains", schemeId),
            limit(limitCount),
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          return docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        throw indexError;
      }
    } catch (error) {
      console.error("Error fetching asset damage:", error);
      throw new AppError(
        "Failed to fetch asset damage reports",
        "client-data/fetch-error",
        error,
      );
    }
  }

  // Get CCTV recordings for a specific scheme
  async getCCTVRecordings(schemeId, limitCount = 100) {
    try {
      const recordingsRef = collection(db, "cctvUploads");

      try {
        const q = query(
          recordingsRef,
          where("schemeIds", "array-contains", schemeId),
          orderBy("uploadedAt", "desc"),
          limit(limitCount),
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          dateTime: doc.data().uploadedAt || doc.data().dateTime,
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (
          indexError.code === "failed-precondition" ||
          indexError.message?.includes("index")
        ) {
          console.warn(
            "Index not available for cctvUploads, trying simplified query",
          );
          const simpleQuery = query(
            recordingsRef,
            where("schemeIds", "array-contains", schemeId),
            limit(limitCount),
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            dateTime: doc.data().uploadedAt || doc.data().dateTime,
          }));
          // Sort in memory
          return docs.sort((a, b) => {
            const timeA = a.uploadedAt?.seconds || 0;
            const timeB = b.uploadedAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        throw indexError;
      }
    } catch (error) {
      console.error("Error fetching CCTV recordings:", error);
      throw new AppError(
        "Failed to fetch CCTV recordings",
        "client-data/recordings-error",
        error,
      );
    }
  }
}

export const clientDataService = new ClientDataService();
