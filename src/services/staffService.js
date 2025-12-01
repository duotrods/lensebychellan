import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

class StaffService {
  // ============================================
  // ACTIVITY LOGGING (for Notice Board)
  // ============================================

  async logActivity(activityData) {
    try {
      const activitiesRef = collection(db, 'activities');
      await addDoc(activitiesRef, {
        ...activityData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async getRecentActivities(userId, lastLogoutTime) {
    try {
      const activitiesRef = collection(db, 'activities');
      const q = query(
        activitiesRef,
        where('createdAt', '>', lastLogoutTime),
        where('staffId', '!=', userId), // Don't show own activities
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to get activities:', error);
      return [];
    }
  }

  // ============================================
  // CCTV CHECK FORMS
  // ============================================

  async submitCCTVCheckForm(formData, userId, userName) {
    try {
      const formsRef = collection(db, 'cctvCheckForms');
      const docRef = await addDoc(formsRef, {
        ...formData,
        submittedBy: {
          userId,
          name: userName
        },
        status: 'submitted',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log activity
      await this.logActivity({
        type: 'form_submitted',
        staffId: userId,
        staffName: userName,
        description: `${userName} submitted CCTV Check Form`,
        relatedFormId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('Failed to submit CCTV check form:', error);
      throw error;
    }
  }

  async getCCTVCheckForms(userId = null) {
    try {
      const formsRef = collection(db, 'cctvCheckForms');
      let q;

      if (userId) {
        q = query(
          formsRef,
          where('submittedBy.userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(formsRef, orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to get CCTV check forms:', error);
      return [];
    }
  }

  // ============================================
  // INCIDENT REPORTS
  // ============================================

  async submitIncidentReport(formData, userId, userName) {
    try {
      const reportsRef = collection(db, 'incidentReports');
      const docRef = await addDoc(reportsRef, {
        ...formData,
        submittedBy: {
          userId,
          name: userName
        },
        status: 'action needed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log activity
      await this.logActivity({
        type: 'form_submitted',
        staffId: userId,
        staffName: userName,
        description: `${userName} submitted Incident Report`,
        relatedFormId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('Failed to submit incident report:', error);
      throw error;
    }
  }

  async getIncidentReports(userId = null) {
    try {
      const reportsRef = collection(db, 'incidentReports');
      let q;

      if (userId) {
        q = query(
          reportsRef,
          where('submittedBy.userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(reportsRef, orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to get incident reports:', error);
      return [];
    }
  }

  async updateReportStatus(reportId, status) {
    try {
      const reportRef = doc(db, 'incidentReports', reportId);
      await updateDoc(reportRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to update report status:', error);
      throw error;
    }
  }

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================

  async getDashboardStats(userId) {
    try {
      // Get counts from all collections
      const cctvForms = await this.getCCTVCheckForms(userId);
      const incidentReports = await this.getIncidentReports(userId);

      // Get this week's count
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const cctvThisWeek = cctvForms.filter(form =>
        form.createdAt?.toDate() > oneWeekAgo
      ).length;

      const incidentsThisWeek = incidentReports.filter(report =>
        report.createdAt?.toDate() > oneWeekAgo
      ).length;

      return {
        cctvCheckTotal: cctvForms.length,
        cctvCheckThisWeek: cctvThisWeek,
        incidentReportTotal: incidentReports.length,
        incidentReportThisWeek: incidentsThisWeek,
        dailyLogsTotal: 0, // TODO: Implement when we add daily logs
        dailyLogsThisWeek: 0,
        assetDamageTotal: 0, // TODO: Implement when we add asset damage
        assetDamageThisWeek: 0
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      return {
        cctvCheckTotal: 0,
        cctvCheckThisWeek: 0,
        incidentReportTotal: 0,
        incidentReportThisWeek: 0,
        dailyLogsTotal: 0,
        dailyLogsThisWeek: 0,
        assetDamageTotal: 0,
        assetDamageThisWeek: 0
      };
    }
  }

  // ============================================
  // CCTV UPLOADS
  // ============================================

  async saveCCTVUploadMetadata(uploadData, userId, userName) {
    try {
      const uploadsRef = collection(db, 'cctvUploads');
      const docRef = await addDoc(uploadsRef, {
        ...uploadData,
        uploadedBy: {
          userId,
          name: userName
        },
        uploadedAt: serverTimestamp()
      });

      // Log activity
      await this.logActivity({
        type: 'upload',
        staffId: userId,
        staffName: userName,
        description: `${userName} uploaded ${uploadData.fileName}`
      });

      return docRef.id;
    } catch (error) {
      console.error('Failed to save upload metadata:', error);
      throw error;
    }
  }

  async getCCTVUploads(userId = null) {
    try {
      const uploadsRef = collection(db, 'cctvUploads');
      let q;

      if (userId) {
        q = query(
          uploadsRef,
          where('uploadedBy.userId', '==', userId),
          orderBy('uploadedAt', 'desc')
        );
      } else {
        q = query(uploadsRef, orderBy('uploadedAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to get CCTV uploads:', error);
      return [];
    }
  }

  async submitCCTVUpload(uploadData, userId, userName) {
    try {
      const uploadsRef = collection(db, 'cctvUploads');
      const docRef = await addDoc(uploadsRef, {
        ...uploadData,
        submittedBy: userName,
        uploadedBy: {
          userId,
          name: userName
        },
        createdAt: serverTimestamp()
      });

      // Log activity
      await this.logActivity({
        type: 'cctv_upload',
        staffId: userId,
        staffName: userName,
        description: `${userName} uploaded CCTV footage for ${uploadData.scheme} - ${uploadData.cameraNumber}`,
        relatedUploadId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('Failed to submit CCTV upload:', error);
      throw error;
    }
  }

  async deleteCCTVUpload(uploadId) {
    try {
      const uploadRef = doc(db, 'cctvUploads', uploadId);
      await updateDoc(uploadRef, {
        deleted: true,
        deletedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to delete CCTV upload:', error);
      throw error;
    }
  }
}

export const staffService = new StaffService();
