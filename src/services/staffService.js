/* eslint-disable no-unused-vars */
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
  onSnapshot,
  startAfter,
  getCountFromServer,
  increment,
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { referenceIdService } from "./referenceIdService";
import {
  extractSchemeId,
  SCHEMES,
  DEMO_SCHEME_ID,
  getThirdPartySchemeById,
} from "../utils/schemes";

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
      // Avoid != operator (costs 2x reads internally) — filter own activities client-side
      const q = query(
        activitiesRef,
        where("createdAt", ">", lastLogoutTime),
        orderBy("createdAt", "desc"),
        limit(25), // Fetch a few extra to account for client-side filtering
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((a) => a.staffId !== userId) // Filter own activities in browser (free)
        .slice(0, 20); // Keep max 20
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
      const hasA417Data =
        (formData.a417Cameras && formData.a417Cameras.length > 0) ||
        (formData.a417Comments && formData.a417Comments.trim() !== "");
      if (hasA417Data) {
        schemeIds.push("A417");
      }

      // Check A11/A47 Kier/Core section
      const hasKierCoreData =
        (formData.kierCore && formData.kierCore.length > 0) ||
        (formData.kierCoreComments && formData.kierCoreComments.trim() !== "");
      if (hasKierCoreData) {
        schemeIds.push("A47");
      }

      // Check M3 Jct 9 section
      const hasM3Data =
        (formData.m3Jct9 && formData.m3Jct9.length > 0) ||
        (formData.m3Jct9Comments && formData.m3Jct9Comments.trim() !== "");
      if (hasM3Data) {
        schemeIds.push("M3");
      }

      // Check Demo section
      const hasDemoData =
        (formData.demoCameras && formData.demoCameras.length > 0) ||
        (formData.demoComments && formData.demoComments.trim() !== "");
      if (hasDemoData) {
        schemeIds.push("DMO1");
      }

      // Check third party dynamic scheme sections (keys: tp_{schemeId}_cameras / tp_{schemeId}_comments)
      const tpSchemeIds = Object.keys(formData)
        .filter(
          (k) =>
            k.startsWith("tp_") &&
            k.endsWith("_cameras") &&
            formData[k]?.length > 0,
        )
        .map((k) => k.replace(/^tp_/, "").replace(/_cameras$/, ""));
      const tpCommentIds = Object.keys(formData)
        .filter(
          (k) =>
            k.startsWith("tp_") &&
            k.endsWith("_comments") &&
            formData[k]?.trim?.(),
        )
        .map((k) => k.replace(/^tp_/, "").replace(/_comments$/, ""));
      [...new Set([...tpSchemeIds, ...tpCommentIds])].forEach((id) => {
        if (!schemeIds.includes(id)) schemeIds.push(id);
      });

      // If no data in any section (clean check - all cameras working),
      // include all real scheme IDs so every client can see the clean check form
      if (schemeIds.length === 0) {
        schemeIds.push("A417", "A47", "M3");
      }

      // Use the first scheme as the primary schemeId for backward compatibility
      const schemeId = schemeIds[0];

      // Check if this is a demo submission (only has DMO1 scheme)
      const isDemo = schemeIds.length === 1 && schemeIds[0] === DEMO_SCHEME_ID;

      // Check if this is a third party submission (all schemeIds are third party schemes)
      const tpSchemeId =
        schemeIds.length > 0 &&
        schemeIds.every((id) => getThirdPartySchemeById(id))
          ? schemeIds[0]
          : null;

      // Generate reference ID — isolated counter per third party scheme, separate demo counter, or real staff counter
      const referenceId = await referenceIdService.generateReferenceId(
        "cctvCheck",
        isDemo,
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
              limit(limitCount),
            )
          : query(
              formsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc"),
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
      const hasA417Data =
        (formData.a417Cameras && formData.a417Cameras.length > 0) ||
        (formData.a417Comments && formData.a417Comments.trim() !== "");
      if (hasA417Data) {
        schemeIds.push("A417");
      }

      // Check A11/A47 Kier/Core section
      const hasKierCoreData =
        (formData.kierCore && formData.kierCore.length > 0) ||
        (formData.kierCoreComments && formData.kierCoreComments.trim() !== "");
      if (hasKierCoreData) {
        schemeIds.push("A47");
      }

      // Check M3 Jct 9 section
      const hasM3Data =
        (formData.m3Jct9 && formData.m3Jct9.length > 0) ||
        (formData.m3Jct9Comments && formData.m3Jct9Comments.trim() !== "");
      if (hasM3Data) {
        schemeIds.push("M3");
      }

      // Check Demo section
      const hasDemoData =
        (formData.demoCameras && formData.demoCameras.length > 0) ||
        (formData.demoComments && formData.demoComments.trim() !== "");
      if (hasDemoData) {
        schemeIds.push("DMO1");
      }

      // If no data in any section (clean check - all cameras working),
      // include all real scheme IDs so every client can see the clean check form
      if (schemeIds.length === 0) {
        schemeIds.push("A417", "A47", "M3");
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

  _countVehicles(formData) {
    const r = formData?.recoveryRequested;
    if (!r || typeof r !== "object") return 0;
    return (r.light || 0) + (r.heavy || 0) + (r.ipv || 0) + (r.hetos || 0);
  }

  async _updateSchemeVehicleStats(schemeId, delta) {
    if (!schemeId || delta === 0) return;
    const statsRef = doc(db, "schemeStats", schemeId);
    await setDoc(
      statsRef,
      { totalVehiclesDispatched: increment(delta) },
      { merge: true },
    );
  }

  async submitIncidentReport(formData, userId, userName, status = "submitted") {
    try {
      // Extract schemeId from scheme field (e.g., "A417 Missing Link - Kier" -> "A417")
      const schemeId = extractSchemeId(formData.scheme);

      // Check if this is a demo submission
      const isDemo = schemeId === DEMO_SCHEME_ID;

      // Check if this is a third party submission
      const tpSchemeId = getThirdPartySchemeById(schemeId) ? schemeId : null;

      // Generate reference ID — isolated counter per third party scheme, separate demo counter, or real staff counter
      const referenceId = await referenceIdService.generateReferenceId(
        "incident",
        isDemo,
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
        isPureIncident:
          formData.incidentType !== "Free Recovery" &&
          formData.incidentType !== "Drive Off" &&
          formData.incursion !== "YES" &&
          !formData.propertyDamage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update running vehicle total for this scheme
      const vehicleDelta = this._countVehicles(formData);
      if (vehicleDelta > 0)
        await this._updateSchemeVehicleStats(schemeId, vehicleDelta);

      // Log activity
      await this.logActivity({
        type: "form_submitted",
        staffId: userId,
        staffName: userName,
        description: `${userName} submitted Incident Report ${referenceId}`,
        relatedFormId: docRef.id,
      });

      return { id: docRef.id, referenceId };
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
              limit(limitCount),
            )
          : query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc"),
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
        isPureIncident:
          formData.incidentType !== "Free Recovery" &&
          formData.incidentType !== "Drive Off" &&
          formData.incursion !== "YES" &&
          !formData.propertyDamage,
        editHistory,
        lastEditedBy: {
          userId,
          name: userName,
        },
        updatedAt: serverTimestamp(),
      });

      // Update running vehicle total — only the difference
      const oldVehicles = this._countVehicles(currentData);
      const newVehicles = this._countVehicles(formData);
      const delta = newVehicles - oldVehicles;
      if (delta !== 0) await this._updateSchemeVehicleStats(schemeId, delta);

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

      // Subtract vehicles from running total
      const vehicleDelta = this._countVehicles(currentData);
      if (vehicleDelta > 0) {
        const deletedSchemeId =
          currentData.schemeId || extractSchemeId(currentData.scheme);
        await this._updateSchemeVehicleStats(deletedSchemeId, -vehicleDelta);
      }

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
  // REAL-TIME SUBSCRIPTIONS (Cost-optimized)
  // ============================================

  /**
   * Subscribe to real-time live incidents for Live Operator Dashboard
   * Uses onSnapshot for instant updates - only charges when data changes
   * @param {function} callback - Called with array of live incidents
   * @param {function} onError - Called on error
   * @returns {function} Unsubscribe function
   */
  subscribeLiveIncidents(callback, onError) {
    const reportsRef = collection(db, "incidentReports");
    const q = query(
      reportsRef,
      where("status", "==", "live"),
      orderBy("createdAt", "desc"),
      limit(50), // Reasonable limit for live incidents
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const incidents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(incidents);
      },
      onError,
    );
  }

  /**
   * Get count of completed incidents (efficient server-side count)
   * Uses getCountFromServer - only 1 read regardless of document count
   */
  async getCompletedIncidentsCount() {
    try {
      const reportsRef = collection(db, "incidentReports");
      const q = query(reportsRef, where("status", "==", "completed"));
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error("Failed to get completed incidents count:", error);
      return 0;
    }
  }

  /**
   * Get paginated completed incidents - TRUE server-side pagination
   * Only reads `pageSize` documents per request (massive cost savings!)
   * @param {number} pageSize - Number of documents per page
   * @param {DocumentSnapshot|null} lastDoc - Last document from previous page (cursor)
   * @returns {Promise<{incidents: Array, lastDoc: DocumentSnapshot, hasMore: boolean}>}
   */
  async getCompletedIncidentsPaginated(pageSize = 10, lastDoc = null) {
    try {
      const reportsRef = collection(db, "incidentReports");
      let q;

      if (lastDoc) {
        q = query(
          reportsRef,
          where("status", "==", "completed"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(pageSize),
        );
      } else {
        q = query(
          reportsRef,
          where("status", "==", "completed"),
          orderBy("createdAt", "desc"),
          limit(pageSize),
        );
      }

      const snapshot = await getDocs(q);
      const incidents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        incidents,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize,
      };
    } catch (error) {
      console.error("Failed to get paginated completed incidents:", error);
      return { incidents: [], lastDoc: null, hasMore: false };
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
          where("createdAt", ">=", sinceTimestamp),
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
            oneWeekAgoTimestamp,
          ),
          this.getCollectionCountSince(
            "incidentReports",
            userId,
            oneWeekAgoTimestamp,
          ),
          this.getCollectionCountSince(
            "assetDamageReports",
            userId,
            oneWeekAgoTimestamp,
          ),
          this.getCollectionCountSince(
            "dailyOccurrenceReports",
            userId,
            oneWeekAgoTimestamp,
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
          limit(limitCount),
        );
      } else {
        q = query(uploadsRef, orderBy("uploadedAt", "desc"), limit(limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((doc) => doc.deleted !== true);
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

      // Check if this is a third party submission
      const tpSchemeId = getThirdPartySchemeById(schemeId) ? schemeId : null;

      // Generate reference ID — isolated counter per third party scheme, separate demo counter, or real staff counter
      const referenceId = await referenceIdService.generateReferenceId(
        "assetDamage",
        isDemo,
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
              limit(limitCount),
            )
          : query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc"),
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

  // ─── CCTV Faults ────────────────────────────────────────────────────────────

  async submitCCTVFaultsReport(formData, userId, userName) {
    try {
      const schemeId = formData.scheme
        ? extractSchemeId(formData.scheme)
        : null;
      const isDemo = schemeId === DEMO_SCHEME_ID;
      const referenceId = await referenceIdService.generateReferenceId(
        "cctvFaults",
        isDemo,
      );

      const docRef = await addDoc(collection(db, "cctvFaultsReports"), {
        ...formData,
        type: "CCTV Faults",
        status: "live",
        schemeId,
        schemeIds: [schemeId],
        referenceId,
        submittedBy: { userId, name: userName },
        clientAcknowledged: false,
        clientNote: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await this.logActivity({
        type: "form_submitted",
        staffId: userId,
        staffName: userName,
        description: `${userName} submitted CCTV Fault Report ${referenceId}`,
        relatedFormId: docRef.id,
      });

      return { id: docRef.id, referenceId };
    } catch (error) {
      console.error("Failed to submit CCTV fault report:", error);
      throw error;
    }
  }

  async getCCTVFaultsReports() {
    try {
      const q = query(
        collection(db, "cctvFaultsReports"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Failed to get CCTV fault reports:", error);
      return [];
    }
  }

  async updateCCTVFaultsReport(reportId, formData, userId, userName) {
    try {
      const reportRef = doc(db, "cctvFaultsReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) throw new Error("Report not found");

      const currentData = reportDoc.data();
      const editHistory = currentData.editHistory || [];
      editHistory.push({
        editedBy: { userId, name: userName },
        editedAt: new Date(),
        previousSubmittedBy: currentData.submittedBy,
      });

      const schemeId = formData.scheme
        ? extractSchemeId(formData.scheme)
        : currentData.schemeId;

      await updateDoc(reportRef, {
        ...formData,
        schemeId,
        schemeIds: [schemeId],
        editHistory,
        lastEditedBy: { userId, name: userName },
        updatedAt: serverTimestamp(),
      });

      await this.logActivity({
        type: "form_edited",
        staffId: userId,
        staffName: userName,
        description: `${userName} edited CCTV Fault Report ${currentData.referenceId}`,
        relatedFormId: reportId,
      });

      return reportId;
    } catch (error) {
      console.error("Failed to update CCTV fault report:", error);
      throw error;
    }
  }

  // Real-time subscription to live CCTV faults.
  // Pass tpSchemeIds array to scope the feed to a company's schemes.
  // null = real staff (see all).
  subscribeAllLiveCCTVFaults(callback, onError, tpSchemeIds = null) {
    const hasFilter = tpSchemeIds && tpSchemeIds.length > 0;

    if (hasFilter) {
      // TP staff: one listener per scheme — avoids composite index requirement
      // and the "in" operator SDK crash.
      const resultsByScheme = {};
      const unsubs = tpSchemeIds.map((schemeId) => {
        const q = query(
          collection(db, "cctvFaultsReports"),
          where("status", "==", "live"),
          where("schemeId", "==", schemeId),
          orderBy("createdAt", "desc"),
          limit(100),
        );
        return onSnapshot(
          q,
          (snapshot) => {
            resultsByScheme[schemeId] = snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            const merged = Object.values(resultsByScheme)
              .flat()
              .sort(
                (a, b) =>
                  (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
              );
            callback(merged);
          },
          (err) => {
            if (onError) onError(err);
          },
        );
      });
      return () => unsubs.forEach((u) => u());
    }

    // Real staff — single query, no scheme filter needed.
    const q = query(
      collection(db, "cctvFaultsReports"),
      where("status", "==", "live"),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const faults = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(faults);
      },
      (error) => {
        if (
          error.code === "failed-precondition" ||
          error.message?.includes("index")
        ) {
          console.warn(
            "Index not available for live CCTV faults, using fallback",
          );
          const fallback = query(
            collection(db, "cctvFaultsReports"),
            where("status", "==", "live"),
            limit(100),
          );
          return onSnapshot(
            fallback,
            (snapshot) => {
              const faults = snapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .sort(
                  (a, b) =>
                    (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
                );
              callback(faults);
            },
            onError,
          );
        }
        if (onError) onError(error);
      },
    );
  }

  async completeCCTVFault(reportId, userId, userName) {
    try {
      const reportRef = doc(db, "cctvFaultsReports", reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) throw new Error("Report not found");

      const { referenceId } = reportDoc.data();

      await updateDoc(reportRef, {
        status: "completed",
        completedAt: serverTimestamp(),
        completedBy: { userId, name: userName },
        updatedAt: serverTimestamp(),
      });

      await this.logActivity({
        type: "form_completed",
        staffId: userId,
        staffName: userName,
        description: `${userName} marked CCTV Fault Report ${referenceId} as completed`,
        relatedFormId: reportId,
      });

      return reportId;
    } catch (error) {
      console.error("Failed to complete CCTV fault report:", error);
      throw error;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────

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
        orderBy("createdAt", "desc"),
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
            (occ) => occ.date === firstOccurrenceDate,
          );
          if (hasMatchingDate) {
            // Use the report's schemeIds array directly (more reliable than extracting from occurrences)
            // This correctly handles "All Schemes" which stores ["A417", "M3", "A47"] without DMO1
            const reportSchemeIds = data.schemeIds || [];

            const hasAnyDemo = reportSchemeIds.includes(DEMO_SCHEME_ID);
            const hasOnlyDemo =
              reportSchemeIds.length > 0 &&
              reportSchemeIds.every((id) => id === DEMO_SCHEME_ID);

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
          (occ) => occ.scheme === "All Schemes",
        );
        let schemeIds;
        if (hasAllSchemes) {
          // Exclude demo scheme from "All Schemes"
          schemeIds = SCHEMES.filter((scheme) => !scheme.isDemo).map(
            (scheme) => scheme.id,
          );
        } else {
          schemeIds = [
            ...new Set(
              mergedOccurrences
                .map((occ) => (occ.scheme ? extractSchemeId(occ.scheme) : null))
                .filter((id) => id !== null),
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
      // Check if this is a third party submission
      const tpSchemeId =
        !isNewSubmissionDemo &&
        newSubmissionSchemeId &&
        getThirdPartySchemeById(newSubmissionSchemeId)
          ? newSubmissionSchemeId
          : null;

      // Generate reference ID — isolated counter per third party scheme, separate demo counter, or real staff counter
      const referenceId = await referenceIdService.generateReferenceId(
        "dailyOccurrence",
        isNewSubmissionDemo,
      );

      // Extract unique schemeIds from all occurrences
      const hasAllSchemes = formData.occurrences.some(
        (occ) => occ.scheme === "All Schemes",
      );
      let schemeIds;
      if (hasAllSchemes) {
        // Exclude demo scheme from "All Schemes"
        schemeIds = SCHEMES.filter((scheme) => !scheme.isDemo).map(
          (scheme) => scheme.id,
        );
      } else {
        schemeIds = [
          ...new Set(
            formData.occurrences
              .map((occ) => (occ.scheme ? extractSchemeId(occ.scheme) : null))
              .filter((id) => id !== null),
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
              limit(limitCount),
            )
          : query(
              reportsRef,
              where("submittedBy.userId", "==", userId),
              orderBy("createdAt", "desc"),
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
        (occ) => occ.scheme === "All Schemes",
      );

      let schemeIds;
      if (hasAllSchemes) {
        // Include all scheme IDs except demo when "All Schemes" is selected
        schemeIds = SCHEMES.filter((scheme) => !scheme.isDemo).map(
          (scheme) => scheme.id,
        );
      } else if (formData.occurrences) {
        // Extract unique scheme IDs from occurrences
        schemeIds = [
          ...new Set(
            formData.occurrences
              .map((occ) => (occ.scheme ? extractSchemeId(occ.scheme) : null))
              .filter((id) => id !== null),
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
  async removeOccurrenceFromReport(
    reportId,
    occurrenceIndex,
    userId,
    userName,
  ) {
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
      const updatedOccurrences = occurrences.filter(
        (_, i) => i !== occurrenceIndex,
      );

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
        (occ) => occ.scheme === "All Schemes",
      );

      let schemeIds;
      if (hasAllSchemes) {
        schemeIds = SCHEMES.filter((scheme) => !scheme.isDemo).map(
          (scheme) => scheme.id,
        );
      } else {
        schemeIds = [
          ...new Set(
            updatedOccurrences
              .map((occ) => extractSchemeId(occ.scheme))
              .filter(Boolean),
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

      return {
        deleted: false,
        reportId,
        remainingOccurrences: updatedOccurrences.length,
      };
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

  // ============================================
  // SERVER-SIDE PAGINATION (Cost-optimized)
  // ============================================

  /**
   * Get all forms with server-side pagination (COST-OPTIMIZED!)
   * Only reads `pageSize` documents per request (massive cost savings!)
   * @param {number} pageSize - Number of documents per page
   * @param {object} cursors - Cursors for each collection type
   * @returns {Promise<{forms: Array, cursors: object, hasMore: boolean}>}
   */
  async getAllFormsPaginated(pageSize = 10, cursors = {}, schemeIds = null) {
    try {
      // Fetch pageSize from each type so the merged result is truly chronological
      const perTypeLimit = pageSize;

      const [
        cctvForms,
        incidentReports,
        assetDamageReports,
        dailyOccurrenceReports,
        cctvFaultsReports,
      ] = await Promise.all([
        this.fetchPaginatedForms(
          "cctvCheckForms",
          perTypeLimit,
          cursors.cctv,
          schemeId,
        ),
        this.fetchPaginatedForms(
          "incidentReports",
          perTypeLimit,
          cursors.incident,
          schemeId,
        ),
        this.fetchPaginatedForms(
          "assetDamageReports",
          perTypeLimit,
          cursors.assetDamage,
          schemeId,
        ),
        this.fetchPaginatedForms(
          "dailyOccurrenceReports",
          perTypeLimit,
          cursors.dailyOccurrence,
          schemeId,
        ),
        this.fetchPaginatedForms(
          "cctvFaultsReports",
          perTypeLimit,
          cursors.cctvFaults,
          schemeId,
        ),
      ]);

      // Transform and combine all forms — tag each with its source for cursor tracking
      const allForms = [
        ...cctvForms.docs.map((f) => ({
          ...f,
          type: "CCTV Check Sheet",
          _source: "cctv",
        })),
        ...incidentReports.docs.map((f) => ({
          ...f,
          type: "Incident Report",
          _source: "incident",
        })),
        ...assetDamageReports.docs.map((f) => ({
          ...f,
          type: "Asset Damage",
          _source: "assetDamage",
        })),
        ...dailyOccurrenceReports.docs.map((f) => ({
          ...f,
          type: "Daily Occurrence",
          _source: "dailyOccurrence",
        })),
        ...cctvFaultsReports.docs.map((f) => ({
          ...f,
          type: "CCTV Faults",
          _source: "cctvFaults",
        })),
      ];

      // Sort by createdAt and take only pageSize items
      const sortedForms = allForms
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        })
        .slice(0, pageSize);

      // Only advance cursors for collections that had docs included in the final slice.
      // This prevents skipping unseen docs from collections that were fetched but not displayed.
      const newCursors = { ...cursors };
      sortedForms.forEach((form) => {
        if (form._firestoreDoc) {
          newCursors[form._source] = form._firestoreDoc;
        }
      });

      // Clean internal tracking fields before returning
      const cleanForms = sortedForms.map(
        ({ _source, _firestoreDoc, ...rest }) => rest,
      );

      return {
        forms: cleanForms,
        cursors: newCursors,
        hasMore:
          cctvForms.hasMore ||
          incidentReports.hasMore ||
          assetDamageReports.hasMore ||
          dailyOccurrenceReports.hasMore ||
          cctvFaultsReports.hasMore,
      };
    } catch (error) {
      console.error("Failed to get paginated forms:", error);
      return { forms: [], cursors: {}, hasMore: false };
    }
  }

  /**
   * Get forms of a specific type with true server-side pagination
   * Used when a type filter is active — fetches exactly pageSize of that type only
   */
  async getFormsByTypePaginated(
    formType,
    pageSize = 10,
    lastDoc = null,
    schemeId = null,
  ) {
    const configMap = {
      "cctv-check": { collection: "cctvCheckForms", label: "CCTV Check Sheet" },
      incident: { collection: "incidentReports", label: "Incident Report" },
      "asset-damage": {
        collection: "assetDamageReports",
        label: "Asset Damage",
      },
      "daily-occurrence": {
        collection: "dailyOccurrenceReports",
        label: "Daily Occurrence",
      },
      "cctv-faults": { collection: "cctvFaultsReports", label: "CCTV Faults" },
    };
    const config = configMap[formType];
    if (!config) return { forms: [], lastDoc: null, hasMore: false };

    try {
      const result = await this.fetchPaginatedForms(
        config.collection,
        pageSize,
        lastDoc,
        schemeId,
      );
      const forms = result.docs.map(({ _firestoreDoc, ...f }) => ({
        ...f,
        type: config.label,
      }));
      return { forms, lastDoc: result.lastDoc, hasMore: result.hasMore };
    } catch (error) {
      console.error(`Error fetching ${formType} forms:`, error);
      return { forms: [], lastDoc: null, hasMore: false };
    }
  }

  /**
   * Helper method to fetch paginated documents from a collection
   */
  async fetchPaginatedForms(
    collectionName,
    limitCount,
    lastDoc,
    schemeId = null,
  ) {
    try {
      const collectionRef = collection(db, collectionName);
      // Build query constraints: optional scheme filter + orderBy + optional cursor + limit
      const constraints = [];
      if (schemeIds && schemeIds.length > 0) {
        constraints.push(where("schemeIds", "array-contains-any", schemeIds));
      }
      constraints.push(orderBy("createdAt", "desc"));
      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      constraints.push(limit(limitCount));

      const q = query(collectionRef, ...constraints);

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        _firestoreDoc: doc, // Keep raw snapshot for cursor tracking
      }));

      return {
        docs,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount,
      };
    } catch (error) {
      console.error(`Error fetching from ${collectionName}:`, error);
      return { docs: [], lastDoc: null, hasMore: false };
    }
  }

  /**
   * Get total count of all forms.
   * tpSchemeIds: array of scheme IDs for a TP company — scopes count to those schemes.
   * null = real staff (excludes demo, sees everything else).
   */
  async getAllFormsCount(tpSchemeIds = null) {
    try {
      const [
        cctvCount,
        incidentCount,
        assetCount,
        dailyCount,
        cctvFaultsCount,
      ] = await Promise.all([
        this.getCollectionCountServerExcludeDemo("cctvCheckForms"),
        this.getCollectionCountServerExcludeDemo("incidentReports"),
        this.getCollectionCountServerExcludeDemo("assetDamageReports"),
        // Daily occurrence forms don't have a top-level schemeId field, so != query excludes them all
        this.getCollectionCountServer("dailyOccurrenceReports"),
        this.getCollectionCountServerExcludeDemo("cctvFaultsReports"),
      ]);

      return (
        cctvCount + incidentCount + assetCount + dailyCount + cctvFaultsCount
      );
    } catch (error) {
      console.warn("Could not get total forms count:", error);
      return 0;
    }
  }

  /**
   * Get count per form type (for stat cards).
   * tpSchemeIds: array of scheme IDs for a TP company — scopes count to those schemes.
   * null = real staff (excludes demo).
   */
  async getAllFormsCountByType(tpSchemeIds = null) {
    try {
      const [
        cctvCount,
        incidentCount,
        assetCount,
        dailyCount,
        cctvFaultsCount,
      ] = await Promise.all([
        this.getCollectionCountServerExcludeDemo("cctvCheckForms"),
        this.getCollectionCountServerExcludeDemo("incidentReports"),
        this.getCollectionCountServerExcludeDemo("assetDamageReports"),
        // Daily occurrence forms don't have a top-level schemeId field, so != query excludes them all
        this.getCollectionCountServer("dailyOccurrenceReports"),
        this.getCollectionCountServerExcludeDemo("cctvFaultsReports"),
      ]);
      return {
        cctvCheckTotal: cctvCount,
        incidentReportTotal: incidentCount,
        assetDamageTotal: assetCount,
        dailyLogsTotal: dailyCount,
        cctvFaultsTotal: cctvFaultsCount,
      };
    } catch (error) {
      console.warn("Could not get forms count by type:", error);
      return {
        cctvCheckTotal: 0,
        incidentReportTotal: 0,
        assetDamageTotal: 0,
        dailyLogsTotal: 0,
        cctvFaultsTotal: 0,
      };
    }
  }

  /**
   * Get count for a specific form type (for filtered pagination display).
   * tpSchemeIds: array of scheme IDs for a TP company — scopes count to those schemes.
   * null = real staff (excludes demo).
   */
  async getFormCountForType(formType, tpSchemeIds = null) {
    const collectionMap = {
      "cctv-check": "cctvCheckForms",
      incident: "incidentReports",
      "asset-damage": "assetDamageReports",
      "daily-occurrence": "dailyOccurrenceReports",
      "cctv-faults": "cctvFaultsReports",
    };
    const collectionName = collectionMap[formType];
    if (!collectionName) return 0;
    // Daily occurrence forms don't have a top-level schemeId, use regular count
    if (formType === "daily-occurrence") {
      return await this.getCollectionCountServer(collectionName);
    }
    return await this.getCollectionCountServerExcludeDemo(collectionName);
  }

  /**
   * Helper: count documents excluding demo submissions.
   */
  async getCollectionCountServerExcludeDemo(collectionName) {
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, where("schemeId", "!=", DEMO_SCHEME_ID));
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.warn(
        `Could not get non-demo count for ${collectionName}:`,
        error,
      );
      return 0;
    }
  }

  async searchFormsByReferenceId(searchTerm) {
    const raw = searchTerm.trim();
    if (!raw) return [];
    const termRef = raw.toUpperCase();
    const termName = raw;
    const termRefEnd = termRef + "\uf8ff";
    const termNameEnd = termName + "\uf8ff";

    const COLLECTIONS = [
      { name: "incidentReports", type: "Incident Report" },
      { name: "assetDamageReports", type: "Asset Damage" },
      { name: "dailyOccurrenceReports", type: "Daily Occurrence" },
      { name: "cctvCheckForms", type: "CCTV Check Sheet" },
      { name: "cctvFaultsReports", type: "CCTV Faults" },
    ];

    // Run referenceId and submittedBy.name queries in parallel
    const [refSnapshots, nameSnapshots] = await Promise.all([
      Promise.all(
        COLLECTIONS.map(({ name }) =>
          getDocs(
            query(
              collection(db, name),
              where("referenceId", ">=", termRef),
              where("referenceId", "<=", termRefEnd),
              limit(10),
            ),
          ),
        ),
      ),
      Promise.all(
        COLLECTIONS.map(({ name }) =>
          getDocs(
            query(
              collection(db, name),
              where("submittedBy.name", ">=", termName),
              where("submittedBy.name", "<=", termNameEnd),
              limit(10),
            ),
          ),
        ),
      ),
    ]);

    const seen = new Set();
    const results = [];

    const addDocs = (snapshots) => {
      snapshots.forEach((snap, i) => {
        const { type } = COLLECTIONS[i];
        snap.docs.forEach((d) => {
          if (seen.has(d.id)) return;
          seen.add(d.id);
          results.push({ id: d.id, ...d.data(), type });
        });
      });
    };

    addDocs(refSnapshots);
    addDocs(nameSnapshots);

    results.sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    );
    return results.slice(0, 20);
  }

  /**
   * Helper to get count from a collection using server-side counting (includes all docs)
   */
  async getCollectionCountServer(collectionName) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getCountFromServer(collectionRef);
      return snapshot.data().count;
    } catch (error) {
      console.warn(`Could not get count for ${collectionName}:`, error);
      return 0;
    }
  }
}

export const staffService = new StaffService();
