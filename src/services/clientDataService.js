import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppError } from '../utils/errorHandling';

class ClientDataService {
  // Get incidents for a specific scheme
  async getSchemeIncidents(schemeId, limitCount = 100) {
    try {
      const incidentsRef = collection(db, 'incidentReports');

      // Try with schemeId field first
      try {
        const q = query(
          incidentsRef,
          where('schemeId', '==', schemeId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          // If index doesn't exist, try without ordering
          console.warn('Index not available for incidentReports, trying simplified query');
          const simpleQuery = query(
            incidentsRef,
            where('schemeId', '==', schemeId),
            limit(limitCount)
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      console.error('Error fetching incidents:', error);
      throw new AppError('Failed to fetch scheme incidents', 'client-data/fetch-error', error);
    }
  }

  // Get CCTV check reports for a specific scheme
  async getSchemeCCTVChecks(schemeId, limitCount = 100) {
    try {
      const cctvRef = collection(db, 'cctvCheckForms');

      try {
        const q = query(
          cctvRef,
          where('schemeId', '==', schemeId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          console.warn('Index not available for cctvCheckForms, trying simplified query');
          const simpleQuery = query(
            cctvRef,
            where('schemeId', '==', schemeId),
            limit(limitCount)
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          return docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        throw indexError;
      }
    } catch (error) {
      console.error('Error fetching CCTV checks:', error);
      throw new AppError('Failed to fetch CCTV checks', 'client-data/fetch-error', error);
    }
  }

  // Get daily occurrence logs for a specific scheme
  async getSchemeDailyLogs(schemeId, limitCount = 100) {
    try {
      const logsRef = collection(db, 'dailyOccurrenceReports');

      try {
        const q = query(
          logsRef,
          where('schemeId', '==', schemeId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          console.warn('Index not available for dailyOccurrenceReports, trying simplified query');
          const simpleQuery = query(
            logsRef,
            where('schemeId', '==', schemeId),
            limit(limitCount)
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          return docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        throw indexError;
      }
    } catch (error) {
      console.error('Error fetching daily logs:', error);
      throw new AppError('Failed to fetch daily logs', 'client-data/fetch-error', error);
    }
  }

  // Get aggregated statistics for a scheme
  async getSchemeStats(schemeId) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Get recent incidents
      const incidentsRef = collection(db, 'incidentReports');
      const incidentsQuery = query(
        incidentsRef,
        where('schemeId', '==', schemeId),
        where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
      );
      const incidentsSnapshot = await getDocs(incidentsQuery);
      const incidents = incidentsSnapshot.docs.map(doc => doc.data());

      // Calculate statistics
      const stats = {
        totalIncidents: incidents.length,
        incidentsByType: this.groupByField(incidents, 'incidentType'),
        incidentsByLane: this.groupByField(incidents, 'laneAffected'),
        vehiclesDispatched: incidents.filter(i => i.vehicleDispatched).length,
        spottedBy: this.groupByField(incidents, 'spottedBy'),
        recentIncidents: incidents.slice(0, 10).map(incident => ({
          type: incident.incidentType || 'Unknown',
          location: incident.location || 'Unknown',
          time: incident.createdAt,
          status: incident.status || 'Resolved'
        }))
      };

      return stats;
    } catch (error) {
      throw new AppError('Failed to fetch scheme stats', 'client-data/stats-error', error);
    }
  }

  // Helper function to group data by field
  groupByField(data, field) {
    const grouped = {};
    data.forEach(item => {
      const value = item[field] || 'Unknown';
      grouped[value] = (grouped[value] || 0) + 1;
    });
    return grouped;
  }

  // Get CCTV uptime statistics
  async getCCTVUptime(schemeId) {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      const cctvRef = collection(db, 'cctvCheckForms');
      const q = query(
        cctvRef,
        where('schemeId', '==', schemeId),
        where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
      );

      const querySnapshot = await getDocs(q);
      const checks = querySnapshot.docs.map(doc => doc.data());

      if (checks.length === 0) {
        return { uptime: 0, totalChecks: 0 };
      }

      const workingChecks = checks.filter(check => check.status === 'operational' || check.allWorking === true);
      const uptime = ((workingChecks.length / checks.length) * 100).toFixed(1);

      return {
        uptime: parseFloat(uptime),
        totalChecks: checks.length,
        workingChecks: workingChecks.length
      };
    } catch (error) {
      console.error('Failed to fetch CCTV uptime:', error);
      return { uptime: 0, totalChecks: 0 };
    }
  }

  // Get time-series data for charts
  async getTimeSeriesData(schemeId, days = 30) {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

      const incidentsRef = collection(db, 'incidentReports');
      const q = query(
        incidentsRef,
        where('schemeId', '==', schemeId),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const incidents = querySnapshot.docs.map(doc => doc.data());

      // Group by week
      const weeklyData = {};
      incidents.forEach(incident => {
        const date = incident.createdAt.toDate();
        const weekStart = this.getWeekStart(date);
        const weekKey = `Week ${this.getWeekNumber(date)}`;

        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      });

      return Object.entries(weeklyData).map(([name, count]) => ({
        name,
        count
      }));
    } catch (error) {
      console.error('Failed to fetch time series data:', error);
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
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Get all reports for a specific scheme (combines all report types)
  async getAllReports(schemeId) {
    try {
      // Fetch each report type separately with error handling
      const incidents = await this.getSchemeIncidents(schemeId).catch(err => {
        console.error('Failed to fetch incidents:', err);
        return [];
      });

      const assetDamage = await this.getSchemeAssetDamage(schemeId).catch(err => {
        console.error('Failed to fetch asset damage:', err);
        return [];
      });

      const dailyLogs = await this.getSchemeDailyLogs(schemeId).catch(err => {
        console.error('Failed to fetch daily logs:', err);
        return [];
      });

      const cctvChecks = await this.getSchemeCCTVChecks(schemeId).catch(err => {
        console.error('Failed to fetch CCTV checks:', err);
        return [];
      });

      // Transform and combine all reports
      const allReports = [
        ...incidents.map(report => ({
          ...report,
          reportType: 'incident',
          type: report.incidentType,
          timestamp: report.createdAt
        })),
        ...assetDamage.map(report => ({
          ...report,
          reportType: 'asset-damage',
          type: report.damageType,
          timestamp: report.createdAt
        })),
        ...dailyLogs.map(report => ({
          ...report,
          reportType: 'daily-occurrence',
          title: report.title || 'Daily Log',
          timestamp: report.createdAt
        })),
        ...cctvChecks.map(report => ({
          ...report,
          reportType: 'cctv-check',
          title: 'CCTV Check',
          timestamp: report.createdAt
        }))
      ];

      // Sort by timestamp (newest first)
      return allReports.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Error in getAllReports:', error);
      throw new AppError('Failed to fetch all reports', 'client-data/reports-error', error);
    }
  }

  // Get asset damage reports for a specific scheme
  async getSchemeAssetDamage(schemeId, limitCount = 100) {
    try {
      const damageRef = collection(db, 'assetDamageReports');

      try {
        const q = query(
          damageRef,
          where('schemeId', '==', schemeId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          console.warn('Index not available for assetDamageReports, trying simplified query');
          const simpleQuery = query(
            damageRef,
            where('schemeId', '==', schemeId),
            limit(limitCount)
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          return docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
        }
        throw indexError;
      }
    } catch (error) {
      console.error('Error fetching asset damage:', error);
      throw new AppError('Failed to fetch asset damage reports', 'client-data/fetch-error', error);
    }
  }

  // Get CCTV recordings for a specific scheme
  async getCCTVRecordings(schemeId, limitCount = 100) {
    try {
      const recordingsRef = collection(db, 'cctvUploads');

      try {
        const q = query(
          recordingsRef,
          where('scheme', '==', schemeId),
          orderBy('uploadedAt', 'desc'),
          limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateTime: doc.data().uploadedAt || doc.data().dateTime
        }));
      } catch (indexError) {
        // Check if it's an index error or permissions error
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('index')) {
          console.warn('Index not available for cctvUploads, trying simplified query');
          const simpleQuery = query(
            recordingsRef,
            where('scheme', '==', schemeId),
            limit(limitCount)
          );
          const snapshot = await getDocs(simpleQuery);
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dateTime: doc.data().uploadedAt || doc.data().dateTime
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
      console.error('Error fetching CCTV recordings:', error);
      throw new AppError('Failed to fetch CCTV recordings', 'client-data/recordings-error', error);
    }
  }
}

export const clientDataService = new ClientDataService();
