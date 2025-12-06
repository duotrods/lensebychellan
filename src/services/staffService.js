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
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { referenceIdService } from './referenceIdService';

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
      // Generate reference ID
      const referenceId = await referenceIdService.generateReferenceId('cctvCheck');

      const formsRef = collection(db, 'cctvCheckForms');
      const docRef = await addDoc(formsRef, {
        ...formData,
        referenceId,
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
        description: `${userName} submitted CCTV Check Form ${referenceId}`,
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

  async updateCCTVCheckForm(formId, formData, userId, userName) {
    try {
      const formRef = doc(db, 'cctvCheckForms', formId);
      const formDoc = await getDoc(formRef);

      if (!formDoc.exists()) {
        throw new Error('Form not found');
      }

      const currentData = formDoc.data();
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: { userId, name: userName },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy
      });

      await updateDoc(formRef, {
        ...formData,
        editHistory,
        lastEditedBy: { userId, name: userName },
        updatedAt: serverTimestamp()
      });

      await this.logActivity({
        type: 'form_edited',
        staffId: userId,
        staffName: userName,
        description: `${userName} edited CCTV Check Form ${currentData.referenceId}`,
        relatedFormId: formId
      });

      return formId;
    } catch (error) {
      console.error('Failed to update CCTV check form:', error);
      throw error;
    }
  }

  async deleteCCTVCheckForm(formId, userId, userName) {
    try {
      const formRef = doc(db, 'cctvCheckForms', formId);
      const formDoc = await getDoc(formRef);

      if (!formDoc.exists()) {
        throw new Error('Form not found');
      }

      const currentData = formDoc.data();

      await deleteDoc(formRef);

      await this.logActivity({
        type: 'form_deleted',
        staffId: userId,
        staffName: userName,
        description: `${userName} deleted CCTV Check Form ${currentData.referenceId}`,
        relatedFormId: formId
      });

      return formId;
    } catch (error) {
      console.error('Failed to delete CCTV check form:', error);
      throw error;
    }
  }

  // ============================================
  // INCIDENT REPORTS
  // ============================================

  async submitIncidentReport(formData, userId, userName) {
    try {
      // Generate reference ID
      const referenceId = await referenceIdService.generateReferenceId('incident');

      const reportsRef = collection(db, 'incidentReports');
      const docRef = await addDoc(reportsRef, {
        ...formData,
        referenceId,
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
        description: `${userName} submitted Incident Report ${referenceId}`,
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

  async updateIncidentReport(reportId, formData, userId, userName) {
    try {
      const reportRef = doc(db, 'incidentReports', reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const currentData = reportDoc.data();

      // Create edit history entry
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: {
          userId,
          name: userName
        },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy
      });

      await updateDoc(reportRef, {
        ...formData,
        editHistory,
        lastEditedBy: {
          userId,
          name: userName
        },
        updatedAt: serverTimestamp()
      });

      // Log activity
      await this.logActivity({
        type: 'form_edited',
        staffId: userId,
        staffName: userName,
        description: `${userName} edited Incident Report ${currentData.referenceId}`,
        relatedFormId: reportId
      });

      return reportId;
    } catch (error) {
      console.error('Failed to update incident report:', error);
      throw error;
    }
  }

  async deleteIncidentReport(reportId, userId, userName) {
    try {
      const reportRef = doc(db, 'incidentReports', reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const currentData = reportDoc.data();

      await deleteDoc(reportRef);

      await this.logActivity({
        type: 'form_deleted',
        staffId: userId,
        staffName: userName,
        description: `${userName} deleted Incident Report ${currentData.referenceId}`,
        relatedFormId: reportId
      });

      return reportId;
    } catch (error) {
      console.error('Failed to delete incident report:', error);
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
      const assetDamageReports = await this.getAssetDamageReports(userId);
      const dailyOccurrenceReports = await this.getDailyOccurrenceReports(userId);

      // Get this week's count
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const cctvThisWeek = cctvForms.filter(form =>
        form.createdAt?.toDate() > oneWeekAgo
      ).length;

      const incidentsThisWeek = incidentReports.filter(report =>
        report.createdAt?.toDate() > oneWeekAgo
      ).length;

      const assetDamageThisWeek = assetDamageReports.filter(report =>
        report.createdAt?.toDate() > oneWeekAgo
      ).length;

      const dailyLogsThisWeek = dailyOccurrenceReports.filter(report =>
        report.createdAt?.toDate() > oneWeekAgo
      ).length;

      return {
        cctvCheckTotal: cctvForms.length,
        cctvCheckThisWeek: cctvThisWeek,
        incidentReportTotal: incidentReports.length,
        incidentReportThisWeek: incidentsThisWeek,
        dailyLogsTotal: dailyOccurrenceReports.length,
        dailyLogsThisWeek: dailyLogsThisWeek,
        assetDamageTotal: assetDamageReports.length,
        assetDamageThisWeek: assetDamageThisWeek
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

  // ============================================
  // ASSET DAMAGE REPORTS
  // ============================================

  async submitAssetDamageReport(formData, userId, userName) {
    try {
      // Generate reference ID
      const referenceId = await referenceIdService.generateReferenceId('assetDamage');

      const reportsRef = collection(db, 'assetDamageReports');
      const docRef = await addDoc(reportsRef, {
        ...formData,
        referenceId,
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
        description: `${userName} submitted Asset Damage Report ${referenceId}`,
        relatedFormId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('Failed to submit asset damage report:', error);
      throw error;
    }
  }

  async getAssetDamageReports(userId = null) {
    try {
      const reportsRef = collection(db, 'assetDamageReports');
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
      console.error('Failed to get asset damage reports:', error);
      return [];
    }
  }

  async updateAssetDamageReport(reportId, formData, userId, userName) {
    try {
      const reportRef = doc(db, 'assetDamageReports', reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const currentData = reportDoc.data();
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: { userId, name: userName },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy
      });

      await updateDoc(reportRef, {
        ...formData,
        editHistory,
        lastEditedBy: { userId, name: userName },
        updatedAt: serverTimestamp()
      });

      await this.logActivity({
        type: 'form_edited',
        staffId: userId,
        staffName: userName,
        description: `${userName} edited Asset Damage Report ${currentData.referenceId}`,
        relatedFormId: reportId
      });

      return reportId;
    } catch (error) {
      console.error('Failed to update asset damage report:', error);
      throw error;
    }
  }

  async deleteAssetDamageReport(reportId, userId, userName) {
    try {
      const reportRef = doc(db, 'assetDamageReports', reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const currentData = reportDoc.data();

      await deleteDoc(reportRef);

      await this.logActivity({
        type: 'form_deleted',
        staffId: userId,
        staffName: userName,
        description: `${userName} deleted Asset Damage Report ${currentData.referenceId}`,
        relatedFormId: reportId
      });

      return reportId;
    } catch (error) {
      console.error('Failed to delete asset damage report:', error);
      throw error;
    }
  }

  // ============================================
  // DAILY OCCURRENCE REPORTS
  // ============================================

  async submitDailyOccurrenceReport(formData, userId, userName) {
    try {
      // Generate reference ID
      const referenceId = await referenceIdService.generateReferenceId('dailyOccurrence');

      const reportsRef = collection(db, 'dailyOccurrenceReports');
      const docRef = await addDoc(reportsRef, {
        ...formData,
        referenceId,
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
        description: `${userName} submitted Daily Occurrence Report ${referenceId}`,
        relatedFormId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('Failed to submit daily occurrence report:', error);
      throw error;
    }
  }

  async getDailyOccurrenceReports(userId = null) {
    try {
      const reportsRef = collection(db, 'dailyOccurrenceReports');
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
      console.error('Failed to get daily occurrence reports:', error);
      return [];
    }
  }

  async updateDailyOccurrenceReport(reportId, formData, userId, userName) {
    try {
      const reportRef = doc(db, 'dailyOccurrenceReports', reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const currentData = reportDoc.data();
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: { userId, name: userName },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy
      });

      await updateDoc(reportRef, {
        ...formData,
        editHistory,
        lastEditedBy: { userId, name: userName },
        updatedAt: serverTimestamp()
      });

      await this.logActivity({
        type: 'form_edited',
        staffId: userId,
        staffName: userName,
        description: `${userName} edited Daily Occurrence Report ${currentData.referenceId}`,
        relatedFormId: reportId
      });

      return reportId;
    } catch (error) {
      console.error('Failed to update daily occurrence report:', error);
      throw error;
    }
  }

  async deleteDailyOccurrenceReport(reportId, userId, userName) {
    try {
      const reportRef = doc(db, 'dailyOccurrenceReports', reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const currentData = reportDoc.data();

      await deleteDoc(reportRef);

      await this.logActivity({
        type: 'form_deleted',
        staffId: userId,
        staffName: userName,
        description: `${userName} deleted Daily Occurrence Report ${currentData.referenceId}`,
        relatedFormId: reportId
      });

      return reportId;
    } catch (error) {
      console.error('Failed to delete daily occurrence report:', error);
      throw error;
    }
  }
}

export const staffService = new StaffService();
