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
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { referenceIdService } from "./referenceIdService";
import { extractSchemeId, SCHEMES, DEMO_SCHEME_ID } from "../utils/schemes";

class StaffService {
  // ============================================
  // ACTIVITY LOGGING (for Notice Board)
  // ============================================

  async logActivity(activityData) {
    try {
      const activitiesRef = collection(db, "activities");
      await addDoc(activitiesRef, {
        ...activityData,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }

  async getRecentActivities(userId, lastLogoutTime) {
    try {
      const activitiesRef = collection(db, "activities");
      const q = query(
        activitiesRef,
        where("createdAt", ">", lastLogoutTime),
        where("staffId", "!=", userId), // Don't show own activities
        orderBy("createdAt", "desc"),
        limit(20)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Failed to get activities:", error);
      return [];
    }
  }

  // ============================================
  // CCTV CHECK FORMS
  // ============================================

  async submitCCTVCheckForm(formData, userId, userName) {
    try {
      // Dynamically determine which schemes have data (issues or comments)
      const schemeIds = [];

      // Check A417 section
      const hasA417Data = (formData.a417Cameras && formData.a417Cameras.length > 0) ||
                          (formData.a417Comments && formData.a417Comments.trim() !== "");
      if (hasA417Data) {
        schemeIds.push("A417");
      }

      // Check A11/A47 Kier/Core section
      const hasKierCoreData = (formData.kierCore && formData.kierCore.length > 0) ||
                              (formData.kierCoreComments && formData.kierCoreComments.trim() !== "");
      if (hasKierCoreData) {
        schemeIds.push("A47");
      }

      // Check M3 Jct 9 section
      const hasM3Data = (formData.m3Jct9 && formData.m3Jct9.length > 0) ||
                        (formData.m3Jct9Comments && formData.m3Jct9Comments.trim() !== "");
      if (hasM3Data) {
        schemeIds.push("M3");
      }

      // Check Demo section
      const hasDemoData = (formData.demoCameras && formData.demoCameras.length > 0) ||
                          (formData.demoComments && formData.demoComments.trim() !== "");
      if (hasDemoData) {
        schemeIds.push("DMO1");
      }

      // If no data in any section, default to all schemes
      if (schemeIds.length === 0) {
        schemeIds.push("all-schemes");
      }

      // Use the first scheme as the primary schemeId for backward compatibility
      const schemeId = schemeIds[0];

      // Check if this is a demo submission (only has DMO1 scheme)
      const isDemo = schemeIds.length === 1 && schemeIds[0] === DEMO_SCHEME_ID;

      // Generate reference ID (with separate counter for demo)
      const referenceId = await referenceIdService.generateReferenceId(
        "cctvCheck",
        isDemo
      );

      const formsRef = collection(db, "cctvCheckForms");
      const docRef = await addDoc(formsRef, {
        ...formData,
        schemeId, // Keep for backward compatibility
        schemeIds, // New array format for multi-scheme support
        referenceId,
        submittedBy: {
          userId,
          name: userName,
        },
        status: "submitted",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Log activity
      await this.logActivity({
        type: "form_submitted",
        staffId: userId,
        staffName: userName,
        description: `${userName} submitted CCTV Check Form ${referenceId}`,
        relatedFormId: docRef.id,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to submit CCTV check form:", error);
      throw error;
    }
  }

  async getCCTVCheckForms(userId = null, limitCount = null) {
    try {
      const formsRef = collection(db, "cctvCheckForms");
      let q;

      if (userId) {
        // When fetching for a specific user, apply limit if provided
        q = limitCount
          ? query(
              formsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc"),
              limit(limitCount)
            )
          : query(
              formsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc")
            );
      } else {
        // When fetching all, no limit unless explicitly provided
        q = limitCount
          ? query(formsRef, orderBy("createdAt", "desc"), limit(limitCount))
          : query(formsRef, orderBy("createdAt", "desc"));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Failed to get CCTV check forms:", error);
      return [];
    }
  }

  async updateCCTVCheckForm(formId, formData, userId, userName) {
    try {
      const formRef = doc(db, "cctvCheckForms", formId);
      const formDoc = await getDoc(formRef);

      if (!formDoc.exists()) {
        throw new Error("Form not found");
      }

      const currentData = formDoc.data();
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: { userId, name: userName },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy,
      });

      // Dynamically determine which schemes have data (issues or comments)
      const schemeIds = [];

      // Check A417 section
      const hasA417Data = (formData.a417Cameras && formData.a417Cameras.length > 0) ||
                          (formData.a417Comments && formData.a417Comments.trim() !== "");
      if (hasA417Data) {
        schemeIds.push("A417");
      }

      // Check A11/A47 Kier/Core section
      const hasKierCoreData = (formData.kierCore && formData.kierCore.length > 0) ||
                              (formData.kierCoreComments && formData.kierCoreComments.trim() !== "");
      if (hasKierCoreData) {
        schemeIds.push("A47");
      }

      // Check M3 Jct 9 section
      const hasM3Data = (formData.m3Jct9 && formData.m3Jct9.length > 0) ||
                        (formData.m3Jct9Comments && formData.m3Jct9Comments.trim() !== "");
      if (hasM3Data) {
        schemeIds.push("M3");
      }

      // Check Demo section
      const hasDemoData = (formData.demoCameras && formData.demoCameras.length > 0) ||
                          (formData.demoComments && formData.demoComments.trim() !== "");
      if (hasDemoData) {
        schemeIds.push("DMO1");
      }

      // If no data in any section, default to all schemes
      if (schemeIds.length === 0) {
        schemeIds.push("all-schemes");
      }

      // Use the first scheme as the primary schemeId for backward compatibility
      const schemeId = schemeIds[0];

      await updateDoc(formRef, {
        ...formData,
        schemeId, // Keep for backward compatibility
        schemeIds, // Update array for client filtering
        editHistory,
        lastEditedBy: { userId, name: userName },
        updatedAt: serverTimestamp(),
      });

      await this.logActivity({
        type: "form_edited",
        staffId: userId,
        staffName: userName,
        description: `${userName} edited CCTV Check Form ${currentData.referenceId}`,
        relatedFormId: formId,
      });

      return formId;
    } catch (error) {
      console.error("Failed to update CCTV check form:", error);
      throw error;
    }
  }

  async deleteCCTVCheckForm(formId, userId, userName) {
    try {
      const formRef = doc(db, "cctvCheckForms", formId);
      const formDoc = await getDoc(formRef);

      if (!formDoc.exists()) {
        throw new Error("Form not found");
      }

      const currentData = formDoc.data();

      await deleteDoc(formRef);

      await this.logActivity({
        type: "form_deleted",
        staffId: userId,
        staffName: userName,
        description: `${userName} deleted CCTV Check Form ${currentData.referenceId}`,
        relatedFormId: formId,
      });

      return formId;
    } catch (error) {
      console.error("Failed to delete CCTV check form:", error);
      throw error;
    }
  }

  // ============================================
  // INCIDENT REPORTS
  // ============================================

  async submitIncidentReport(formData, userId, userName, status = "submitted") {
    try {
      // Extract schemeId from scheme field (e.g., "A417 Missing Link - Kier" -> "A417")
      const schemeId = extractSchemeId(formData.scheme);

      // Check if this is a demo submission
      const isDemo = schemeId === DEMO_SCHEME_ID;

      // Generate reference ID (with separate counter for demo)
      const referenceId = await referenceIdService.generateReferenceId(
        "incident",
        isDemo
      );

      const reportsRef = collection(db, "incidentReports");
      const docRef = await addDoc(reportsRef, {
        ...formData,
        schemeId, // Keep for backward compatibility
        schemeIds: [schemeId], // New array format for multi-scheme support
        referenceId,
        submittedBy: {
          userId,
          name: userName,
        },
        status, // Use the provided status (defaults to "submitted", can be "live")
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Log activity
      await this.logActivity({
        type: "form_submitted",
        staffId: userId,
        staffName: userName,
        description: `${userName} submitted Incident Report ${referenceId}`,
        relatedFormId: docRef.id,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to submit incident report:", error);
      throw error;
    }
  }

  async getIncidentReports(userId = null, limitCount = null) {
    try {
      const reportsRef = collection(db, "incidentReports");
      let q;

      if (userId) {
        // When fetching for a specific user, apply limit if provided
        q = limitCount
          ? query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc"),
              limit(limitCount)
            )
          : query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc")
            );
      } else {
        // When fetching all, no limit unless explicitly provided
        q = limitCount
          ? query(reportsRef, orderBy("createdAt", "desc"), limit(limitCount))
          : query(reportsRef, orderBy("createdAt", "desc"));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Failed to get incident reports:", error);
      return [];
    }
  }

  async updateReportStatus(reportId, status) {
    try {
      const reportRef = doc(db, "incidentReports", reportId);
      await updateDoc(reportRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update report status:", error);
      throw error;
    }
  }

  async updateIncidentReport(reportId, formData, userId, userName) {
    try {
      const reportRef = doc(db, "incidentReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error("Report not found");
      }

      const currentData = reportDoc.data();

      // Create edit history entry
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: {
          userId,
          name: userName,
        },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy,
      });

      // Recalculate schemeIds when scheme is updated
      const schemeId = formData.scheme
        ? extractSchemeId(formData.scheme)
        : currentData.schemeId;

      await updateDoc(reportRef, {
        ...formData,
        schemeId, // Keep for backward compatibility
        schemeIds: [schemeId], // Update array for client filtering
        editHistory,
        lastEditedBy: {
          userId,
          name: userName,
        },
        updatedAt: serverTimestamp(),
      });

      // Log activity
      await this.logActivity({
        type: "form_edited",
        staffId: userId,
        staffName: userName,
        description: `${userName} edited Incident Report ${currentData.referenceId}`,
        relatedFormId: reportId,
      });

      return reportId;
    } catch (error) {
      console.error("Failed to update incident report:", error);
      throw error;
    }
  }

  async deleteIncidentReport(reportId, userId, userName) {
    try {
      const reportRef = doc(db, "incidentReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error("Report not found");
      }

      const currentData = reportDoc.data();

      await deleteDoc(reportRef);

      await this.logActivity({
        type: "form_deleted",
        staffId: userId,
        staffName: userName,
        description: `${userName} deleted Incident Report ${currentData.referenceId}`,
        relatedFormId: reportId,
      });

      return reportId;
    } catch (error) {
      console.error("Failed to delete incident report:", error);
      throw error;
    }
  }

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================

  // Helper: Count documents in collection (for specific user or all)
  async getCollectionCount(collectionName, userId = null) {
    try {
      const collectionRef = collection(db, collectionName);
      let q;

      if (userId) {
        q = query(collectionRef, where("submittedBy.userId", "==", userId));
      } else {
        q = query(collectionRef);
      }

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(`Failed to count ${collectionName}:`, error);
      return 0;
    }
  }

  // Helper: Count documents created since a date
  async getCollectionCountSince(collectionName, userId, sinceTimestamp) {
    try {
      const collectionRef = collection(db, collectionName);
      let q;

      if (userId) {
        q = query(
          collectionRef,
          where("submittedBy.userId", "==", userId),
          where("createdAt", ">=", sinceTimestamp)
        );
      } else {
        q = query(collectionRef, where("createdAt", ">=", sinceTimestamp));
      }

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(`Failed to count ${collectionName} since date:`, error);
      return 0;
    }
  }

  async getDashboardStats(userId) {
    try {
      // Calculate one week ago as Firestore Timestamp
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoTimestamp = Timestamp.fromDate(oneWeekAgo);

      // Query 1: Total counts (without date filter) - run in parallel
      const [cctvTotal, incidentsTotal, damageTotal, logsTotal] =
        await Promise.all([
          this.getCollectionCount("cctvCheckForms", userId),
          this.getCollectionCount("incidentReports", userId),
          this.getCollectionCount("assetDamageReports", userId),
          this.getCollectionCount("dailyOccurrenceReports", userId),
        ]);

      // Query 2: This week's counts (with date filter) - run in parallel
      const [cctvThisWeek, incidentsThisWeek, damageThisWeek, logsThisWeek] =
        await Promise.all([
          this.getCollectionCountSince(
            "cctvCheckForms",
            userId,
            oneWeekAgoTimestamp
          ),
          this.getCollectionCountSince(
            "incidentReports",
            userId,
            oneWeekAgoTimestamp
          ),
          this.getCollectionCountSince(
            "assetDamageReports",
            userId,
            oneWeekAgoTimestamp
          ),
          this.getCollectionCountSince(
            "dailyOccurrenceReports",
            userId,
            oneWeekAgoTimestamp
          ),
        ]);

      return {
        cctvCheckTotal: cctvTotal,
        cctvCheckThisWeek: cctvThisWeek,
        incidentReportTotal: incidentsTotal,
        incidentReportThisWeek: incidentsThisWeek,
        dailyLogsTotal: logsTotal,
        dailyLogsThisWeek: logsThisWeek,
        assetDamageTotal: damageTotal,
        assetDamageThisWeek: damageThisWeek,
      };
    } catch (error) {
      console.error("Failed to get dashboard stats:", error);
      return {
        cctvCheckTotal: 0,
        cctvCheckThisWeek: 0,
        incidentReportTotal: 0,
        incidentReportThisWeek: 0,
        dailyLogsTotal: 0,
        dailyLogsThisWeek: 0,
        assetDamageTotal: 0,
        assetDamageThisWeek: 0,
      };
    }
  }

  // ============================================
  // CCTV UPLOADS
  // ============================================

  async saveCCTVUploadMetadata(uploadData, userId, userName) {
    try {
      // Extract schemeId from scheme field if present
      const schemeId = uploadData.scheme
        ? extractSchemeId(uploadData.scheme)
        : null;

      const uploadsRef = collection(db, "cctvUploads");
      const docRef = await addDoc(uploadsRef, {
        ...uploadData,
        ...(schemeId && {
          schemeId, // Keep for backward compatibility
          schemeIds: [schemeId], // New array format for multi-scheme support
        }),
        uploadedBy: {
          userId,
          name: userName,
        },
        uploadedAt: serverTimestamp(),
      });

      // Log activity
      await this.logActivity({
        type: "upload",
        staffId: userId,
        staffName: userName,
        description: `${userName} uploaded ${uploadData.fileName}`,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to save upload metadata:", error);
      throw error;
    }
  }

  async getCCTVUploads(userId = null, limitCount = 50) {
    try {
      const uploadsRef = collection(db, "cctvUploads");
      let q;

      if (userId) {
        q = query(
          uploadsRef,
          where("uploadedBy.userId", "==", userId),
          orderBy("uploadedAt", "desc"),
          limit(limitCount)
        );
      } else {
        q = query(uploadsRef, orderBy("uploadedAt", "desc"), limit(limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Failed to get CCTV uploads:", error);
      return [];
    }
  }

  async submitCCTVUpload(uploadData, userId, userName) {
    try {
      // Extract schemeId from scheme field if present
      const schemeId = uploadData.scheme
        ? extractSchemeId(uploadData.scheme)
        : null;

      const uploadsRef = collection(db, "cctvUploads");
      const docRef = await addDoc(uploadsRef, {
        ...uploadData,
        ...(schemeId && {
          schemeId, // Keep for backward compatibility
          schemeIds: [schemeId], // New array format for multi-scheme support
        }),
        submittedBy: userName,
        uploadedBy: {
          userId,
          name: userName,
        },
        uploadedAt: serverTimestamp(), // Changed from createdAt to uploadedAt to match query
      });

      // Log activity
      await this.logActivity({
        type: "cctv_upload",
        staffId: userId,
        staffName: userName,
        description: `${userName} uploaded CCTV footage for ${uploadData.scheme} - ${uploadData.cameraNumber}`,
        relatedUploadId: docRef.id,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to submit CCTV upload:", error);
      throw error;
    }
  }

  async deleteCCTVUpload(uploadId) {
    try {
      const uploadRef = doc(db, "cctvUploads", uploadId);
      await updateDoc(uploadRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to delete CCTV upload:", error);
      throw error;
    }
  }

  // ============================================
  // ASSET DAMAGE REPORTS
  // ============================================

  async submitAssetDamageReport(formData, userId, userName) {
    try {
      // Extract schemeId from scheme field
      const schemeId = extractSchemeId(formData.scheme);

      // Check if this is a demo submission
      const isDemo = schemeId === DEMO_SCHEME_ID;

      // Generate reference ID (with separate counter for demo)
      const referenceId = await referenceIdService.generateReferenceId(
        "assetDamage",
        isDemo
      );

      const reportsRef = collection(db, "assetDamageReports");
      const docRef = await addDoc(reportsRef, {
        ...formData,
        schemeId, // Keep for backward compatibility
        schemeIds: [schemeId], // New array format for multi-scheme support
        referenceId,
        submittedBy: {
          userId,
          name: userName,
        },
        status: "submitted",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Log activity
      await this.logActivity({
        type: "form_submitted",
        staffId: userId,
        staffName: userName,
        description: `${userName} submitted Asset Damage Report ${referenceId}`,
        relatedFormId: docRef.id,
      });

      return docRef.id;
    } catch (error) {
      console.error("Failed to submit asset damage report:", error);
      throw error;
    }
  }

  async getAssetDamageReports(userId = null, limitCount = null) {
    try {
      const reportsRef = collection(db, "assetDamageReports");
      let q;

      if (userId) {
        // When fetching for a specific user, apply limit if provided
        q = limitCount
          ? query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc"),
              limit(limitCount)
            )
          : query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc")
            );
      } else {
        // When fetching all, no limit unless explicitly provided
        q = limitCount
          ? query(reportsRef, orderBy("createdAt", "desc"), limit(limitCount))
          : query(reportsRef, orderBy("createdAt", "desc"));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Failed to get asset damage reports:", error);
      return [];
    }
  }

  async updateAssetDamageReport(reportId, formData, userId, userName) {
    try {
      const reportRef = doc(db, "assetDamageReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error("Report not found");
      }

      const currentData = reportDoc.data();
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: { userId, name: userName },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy,
      });

      // Recalculate schemeIds when scheme is updated
      const schemeId = formData.scheme
        ? extractSchemeId(formData.scheme)
        : currentData.schemeId;

      await updateDoc(reportRef, {
        ...formData,
        schemeId, // Keep for backward compatibility
        schemeIds: [schemeId], // Update array for client filtering
        editHistory,
        lastEditedBy: { userId, name: userName },
        updatedAt: serverTimestamp(),
      });

      await this.logActivity({
        type: "form_edited",
        staffId: userId,
        staffName: userName,
        description: `${userName} edited Asset Damage Report ${currentData.referenceId}`,
        relatedFormId: reportId,
      });

      return reportId;
    } catch (error) {
      console.error("Failed to update asset damage report:", error);
      throw error;
    }
  }

  async deleteAssetDamageReport(reportId, userId, userName) {
    try {
      const reportRef = doc(db, "assetDamageReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error("Report not found");
      }

      const currentData = reportDoc.data();

      await deleteDoc(reportRef);

      await this.logActivity({
        type: "form_deleted",
        staffId: userId,
        staffName: userName,
        description: `${userName} deleted Asset Damage Report ${currentData.referenceId}`,
        relatedFormId: reportId,
      });

      return reportId;
    } catch (error) {
      console.error("Failed to delete asset damage report:", error);
      throw error;
    }
  }

  // ============================================
  // DAILY OCCURRENCE REPORTS
  // ============================================

  async submitDailyOccurrenceReport(formData, userId, userName) {
    try {
      // Get the date from the first occurrence to check for existing reports
      const firstOccurrenceDate = formData.occurrences[0]?.date;

      if (!firstOccurrenceDate) {
        throw new Error("At least one occurrence with a date is required");
      }

      // Check if a report already exists for this date
      const reportsRef = collection(db, "dailyOccurrenceReports");
      const dateQuery = query(
        reportsRef,
        where("occurrences", "!=", null),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(dateQuery);
      let existingReport = null;

      // Determine if the new submission is from a demo scheme
      const newSubmissionSchemeId = formData.occurrences[0]?.scheme
        ? extractSchemeId(formData.occurrences[0].scheme)
        : null;
      const isNewSubmissionDemo = newSubmissionSchemeId === DEMO_SCHEME_ID;

      // Find existing report with matching date AND same demo/real status
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.occurrences && data.occurrences.length > 0) {
          // Check if any occurrence in the existing report matches today's date
          const hasMatchingDate = data.occurrences.some(
            (occ) => occ.date === firstOccurrenceDate
          );
          if (hasMatchingDate) {
            // Use the report's schemeIds array directly (more reliable than extracting from occurrences)
            // This correctly handles "All Schemes" which stores ["A417", "M3", "A47"] without DMO1
            const reportSchemeIds = data.schemeIds || [];

            const hasAnyDemo = reportSchemeIds.includes(DEMO_SCHEME_ID);
            const hasOnlyDemo = reportSchemeIds.length > 0 &&
              reportSchemeIds.every(id => id === DEMO_SCHEME_ID);

            // For demo submission: only merge with reports that are EXCLUSIVELY demo
            // For real submission: only merge with reports that have NO demo schemes
            if (isNewSubmissionDemo) {
              // Demo staff: only merge with purely demo reports (schemeIds contains only DMO1)
              if (hasOnlyDemo) {
                existingReport = { id: docSnap.id, ...data };
                break;
              }
            } else {
              // Real staff: only merge with reports that have NO demo schemes at all
              if (!hasAnyDemo) {
                existingReport = { id: docSnap.id, ...data };
                break;
              }
            }
          }
        }
      }

      // If an existing report is found, merge the occurrences
      if (existingReport) {
        // Combine existing occurrences with new ones
        const mergedOccurrences = [
          ...existingReport.occurrences,
          ...formData.occurrences,
        ];

        // Recalculate schemeIds from all occurrences
        const hasAllSchemes = mergedOccurrences.some(
          (occ) => occ.scheme === "All Schemes"
        );
        let schemeIds;
        if (hasAllSchemes) {
          // Exclude demo scheme from "All Schemes"
          schemeIds = SCHEMES.filter((scheme) => !scheme.isDemo).map((scheme) => scheme.id);
        } else {
          schemeIds = [
            ...new Set(
              mergedOccurrences
                .map((occ) => (occ.scheme ? extractSchemeId(occ.scheme) : null))
                .filter((id) => id !== null)
            ),
          ];
        }

        // Update the existing report
        const reportRef = doc(db, "dailyOccurrenceReports", existingReport.id);
        await updateDoc(reportRef, {
          occurrences: mergedOccurrences,
          schemeIds,
          updatedAt: serverTimestamp(),
          lastAddedBy: {
            userId,
            name: userName,
            addedAt: serverTimestamp(),
          },
        });

        // Log activity
        await this.logActivity({
          type: "form_updated",
          staffId: userId,
          staffName: userName,
          description: `${userName} added ${formData.occurrences.length} occurrence(s) to Daily Occurrence Report ${existingReport.referenceId} for ${firstOccurrenceDate}`,
          relatedFormId: existingReport.id,
        });

        return {
          id: existingReport.id,
          merged: true,
          referenceId: existingReport.referenceId,
        };
      }

      // No existing report found - create a new one
      // Generate reference ID (with separate counter for demo)
      const referenceId = await referenceIdService.generateReferenceId(
        "dailyOccurrence",
        isNewSubmissionDemo
      );

      // Extract unique schemeIds from all occurrences
      const hasAllSchemes = formData.occurrences.some(
        (occ) => occ.scheme === "All Schemes"
      );
      let schemeIds;
      if (hasAllSchemes) {
        // Exclude demo scheme from "All Schemes"
        schemeIds = SCHEMES.filter((scheme) => !scheme.isDemo).map((scheme) => scheme.id);
      } else {
        schemeIds = [
          ...new Set(
            formData.occurrences
              .map((occ) => (occ.scheme ? extractSchemeId(occ.scheme) : null))
              .filter((id) => id !== null)
          ),
        ];
      }

      const docRef = await addDoc(reportsRef, {
        ...formData,
        schemeIds,
        referenceId,
        submittedBy: {
          userId,
          name: userName,
        },
        status: "submitted",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Log activity
      await this.logActivity({
        type: "form_submitted",
        staffId: userId,
        staffName: userName,
        description: `${userName} submitted Daily Occurrence Report ${referenceId}`,
        relatedFormId: docRef.id,
      });

      return { id: docRef.id, merged: false, referenceId };
    } catch (error) {
      console.error("Failed to submit daily occurrence report:", error);
      throw error;
    }
  }

  async getDailyOccurrenceReports(userId = null, limitCount = null) {
    try {
      const reportsRef = collection(db, "dailyOccurrenceReports");
      let q;

      if (userId) {
        // When fetching for a specific user, apply limit if provided
        q = limitCount
          ? query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc"),
              limit(limitCount)
            )
          : query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc")
            );
      } else {
        // When fetching all, no limit unless explicitly provided
        q = limitCount
          ? query(reportsRef, orderBy("createdAt", "desc"), limit(limitCount))
          : query(reportsRef, orderBy("createdAt", "desc"));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Failed to get daily occurrence reports:", error);
      return [];
    }
  }

  async updateDailyOccurrenceReport(reportId, formData, userId, userName) {
    try {
      const reportRef = doc(db, "dailyOccurrenceReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error("Report not found");
      }

      const currentData = reportDoc.data();
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: { userId, name: userName },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy,
      });

      // Recalculate schemeIds when occurrences are updated
      // Check if any occurrence has "All Schemes"
      const hasAllSchemes = formData.occurrences?.some(
        (occ) => occ.scheme === "All Schemes"
      );

      let schemeIds;
      if (hasAllSchemes) {
        // Include all scheme IDs except demo when "All Schemes" is selected
        schemeIds = SCHEMES.filter((scheme) => !scheme.isDemo).map((scheme) => scheme.id);
      } else if (formData.occurrences) {
        // Extract unique scheme IDs from occurrences
        schemeIds = [
          ...new Set(
            formData.occurrences
              .map((occ) => (occ.scheme ? extractSchemeId(occ.scheme) : null))
              .filter((id) => id !== null)
          ),
        ];
      } else {
        // Fallback to current schemeIds if no occurrences in formData
        schemeIds = currentData.schemeIds || [];
      }

      await updateDoc(reportRef, {
        ...formData,
        schemeIds, // Update array for client filtering
        editHistory,
        lastEditedBy: { userId, name: userName },
        updatedAt: serverTimestamp(),
      });

      await this.logActivity({
        type: "form_edited",
        staffId: userId,
        staffName: userName,
        description: `${userName} edited Daily Occurrence Report ${currentData.referenceId}`,
        relatedFormId: reportId,
      });

      return reportId;
    } catch (error) {
      console.error("Failed to update daily occurrence report:", error);
      throw error;
    }
  }

  async deleteDailyOccurrenceReport(reportId, userId, userName) {
    try {
      const reportRef = doc(db, "dailyOccurrenceReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error("Report not found");
      }

      const currentData = reportDoc.data();

      await deleteDoc(reportRef);

      await this.logActivity({
        type: "form_deleted",
        staffId: userId,
        staffName: userName,
        description: `${userName} deleted Daily Occurrence Report ${currentData.referenceId}`,
        relatedFormId: reportId,
      });

      return reportId;
    } catch (error) {
      console.error("Failed to delete daily occurrence report:", error);
      throw error;
    }
  }

  // Remove a single occurrence from a daily occurrence report (admin only)
  async removeOccurrenceFromReport(reportId, occurrenceIndex, userId, userName) {
    try {
      const reportRef = doc(db, "dailyOccurrenceReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error("Report not found");
      }

      const currentData = reportDoc.data();
      const occurrences = currentData.occurrences || [];

      if (occurrenceIndex < 0 || occurrenceIndex >= occurrences.length) {
        throw new Error("Invalid occurrence index");
      }

      // Get the occurrence being removed for logging
      const removedOccurrence = occurrences[occurrenceIndex];

      // Remove the occurrence at the specified index
      const updatedOccurrences = occurrences.filter((_, i) => i !== occurrenceIndex);

      // If no occurrences left, delete the entire report
      if (updatedOccurrences.length === 0) {
        await deleteDoc(reportRef);

        await this.logActivity({
          type: "form_deleted",
          staffId: userId,
          staffName: userName,
          description: `${userName} deleted Daily Occurrence Report ${currentData.referenceId} (last occurrence removed)`,
          relatedFormId: reportId,
        });

        return { deleted: true, reportId };
      }

      // Recalculate schemeIds from remaining occurrences
      const hasAllSchemes = updatedOccurrences.some(
        (occ) => occ.scheme === "All Schemes"
      );

      let schemeIds;
      if (hasAllSchemes) {
        schemeIds = SCHEMES.filter((scheme) => !scheme.isDemo).map((scheme) => scheme.id);
      } else {
        schemeIds = [
          ...new Set(
            updatedOccurrences
              .map((occ) => extractSchemeId(occ.scheme))
              .filter(Boolean)
          ),
        ];
      }

      // Update edit history
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: { userId, name: userName },
        editedAt: new Date(),
        action: "occurrence_removed",
        removedOccurrence: {
          date: removedOccurrence.date,
          time: removedOccurrence.time,
          scheme: removedOccurrence.scheme,
        },
      });

      await updateDoc(reportRef, {
        occurrences: updatedOccurrences,
        schemeIds,
        editHistory,
        lastEditedBy: { userId, name: userName },
        updatedAt: serverTimestamp(),
      });

      await this.logActivity({
        type: "occurrence_removed",
        staffId: userId,
        staffName: userName,
        description: `${userName} removed occurrence #${occurrenceIndex + 1} from Daily Occurrence Report ${currentData.referenceId}`,
        relatedFormId: reportId,
      });

      return { deleted: false, reportId, remainingOccurrences: updatedOccurrences.length };
    } catch (error) {
      console.error("Failed to remove occurrence from report:", error);
      throw error;
    }
  }

  // Generic delete report function for admin use
  async deleteReport(collectionName, reportId) {
    try {
      const reportRef = doc(db, collectionName, reportId);
      await deleteDoc(reportRef);
      return reportId;
    } catch (error) {
      console.error(`Failed to delete report from ${collectionName}:`, error);
      throw error;
    }
  }
}

export const staffService = new StaffService();
