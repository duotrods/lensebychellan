import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  updateDoc,
  serverTimestamp,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppError } from '../utils/errorHandling';

class OTPService {
  // Generate a random OTP code
  generateOTPCode(schemeId) {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const year = new Date().getFullYear();
    return `${schemeId}-${year}-${randomPart}`;
  }

  // Admin: Create a new OTP code for a scheme
  async createOTP(schemeId, schemeName, adminUid, expiresInDays = 30) {
    try {
      const otpCode = this.generateOTPCode(schemeId);
      const otpRef = doc(db, 'clientOTPs', otpCode);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      await setDoc(otpRef, {
        otpCode,
        schemeId,
        schemeName,
        isUsed: false,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        expiresAt,
        usedBy: null,
        usedAt: null
      });

      return otpCode;
    } catch (error) {
      throw new AppError('Failed to create OTP code', 'otp/create-error', error);
    }
  }

  // Validate OTP code during client signup
  async validateOTP(otpCode) {
    try {
      const otpRef = doc(db, 'clientOTPs', otpCode);
      const otpSnap = await getDoc(otpRef);

      if (!otpSnap.exists()) {
        throw new AppError('Invalid OTP code', 'otp/invalid-code');
      }

      const otpData = otpSnap.data();

      if (otpData.isUsed) {
        throw new AppError('This OTP code has already been used', 'otp/already-used');
      }

      const expiresAt = otpData.expiresAt?.toDate ? otpData.expiresAt.toDate() : otpData.expiresAt ? new Date(otpData.expiresAt) : null;
      if (expiresAt && expiresAt < new Date()) {
        throw new AppError('This OTP code has expired', 'otp/expired');
      }

      return {
        isValid: true,
        schemeId: otpData.schemeId,
        schemeName: otpData.schemeName
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to validate OTP', 'otp/validation-error', error);
    }
  }

  // Mark OTP as used after successful client registration
  async markOTPAsUsed(otpCode, clientUid) {
    try {
      const otpRef = doc(db, 'clientOTPs', otpCode);
      await updateDoc(otpRef, {
        isUsed: true,
        usedBy: clientUid,
        usedAt: serverTimestamp()
      });
    } catch (error) {
      throw new AppError('Failed to mark OTP as used', 'otp/update-error', error);
    }
  }

  // Admin: Get all OTP codes
  async getAllOTPs() {
    try {
      const otpsRef = collection(db, 'clientOTPs');
      const q = query(otpsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new AppError('Failed to fetch OTP codes', 'otp/fetch-error', error);
    }
  }

  // Admin: Get all OTP codes with pagination
  async getAllOTPsPaginated(limitCount = 10, lastDoc = null) {
    try {
      const otpsRef = collection(db, 'clientOTPs');
      let q;

      if (lastDoc) {
        q = query(
          otpsRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      } else {
        q = query(otpsRef, orderBy('createdAt', 'desc'), limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const otps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        otps,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        hasMore: querySnapshot.docs.length === limitCount
      };
    } catch (error) {
      throw new AppError('Failed to fetch OTP codes', 'otp/fetch-error', error);
    }
  }

  // Admin: Get OTPs by scheme
  async getOTPsByScheme(schemeId) {
    try {
      const otpsRef = collection(db, 'clientOTPs');
      const q = query(
        otpsRef,
        where('schemeId', '==', schemeId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new AppError('Failed to fetch scheme OTPs', 'otp/fetch-error', error);
    }
  }

  // Admin: Get available (unused) OTPs
  async getAvailableOTPs() {
    try {
      const otpsRef = collection(db, 'clientOTPs');
      const q = query(
        otpsRef,
        where('isUsed', '==', false),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new AppError('Failed to fetch available OTPs', 'otp/fetch-error', error);
    }
  }

  // ==================== STAFF INVITE CODE METHODS ====================

  // Generate a random Staff Invite Code
  generateStaffInviteCode() {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const year = new Date().getFullYear();
    return `STAFF-${year}-${randomPart}`;
  }

  // Admin: Create a new Staff Invite Code
  async createStaffInviteCode(adminUid, adminName, expiresInDays = 30, maxUses = 1) {
    try {
      const inviteCode = this.generateStaffInviteCode();
      const inviteRef = doc(db, 'staffInviteCodes', inviteCode);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      await setDoc(inviteRef, {
        inviteCode,
        isUsed: false,
        usesRemaining: maxUses,
        maxUses,
        createdBy: adminUid,
        createdByName: adminName,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        usedBy: [],
        usedAt: null,
        lastUsedAt: null
      });

      return inviteCode;
    } catch (error) {
      throw new AppError('Failed to create staff invite code', 'staff-invite/create-error', error);
    }
  }

  // Validate Staff Invite Code during staff signup
  async validateStaffInviteCode(inviteCode) {
    try {
      const inviteRef = doc(db, 'staffInviteCodes', inviteCode);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        return { isValid: false, reason: 'Code does not exist' };
      }

      const inviteData = inviteSnap.data();

      // Check if code is already used (for single-use codes)
      if (inviteData.usesRemaining <= 0) {
        return { isValid: false, reason: 'Code has been fully used' };
      }

      // Check if code has expired
      const now = new Date();
      const expiresAt = inviteData.expiresAt?.toDate();
      if (expiresAt && expiresAt < now) {
        return { isValid: false, reason: 'Code has expired' };
      }

      return {
        isValid: true,
        createdBy: inviteData.createdBy,
        createdByName: inviteData.createdByName
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to validate staff invite code', 'staff-invite/validation-error', error);
    }
  }

  // Mark Staff Invite Code as used after successful staff registration
  async markStaffInviteCodeAsUsed(inviteCode, staffUid) {
    try {
      const inviteRef = doc(db, 'staffInviteCodes', inviteCode);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        throw new AppError('Invite code not found', 'staff-invite/not-found');
      }

      const inviteData = inviteSnap.data();
      const updatedUsedBy = [...(inviteData.usedBy || []), staffUid];
      const usesRemaining = inviteData.usesRemaining - 1;

      await updateDoc(inviteRef, {
        usesRemaining,
        isUsed: usesRemaining <= 0,
        usedBy: updatedUsedBy,
        lastUsedAt: serverTimestamp()
      });
    } catch (error) {
      throw new AppError('Failed to mark invite code as used', 'staff-invite/update-error', error);
    }
  }

  // Admin: Get all Staff Invite Codes
  async getAllStaffInviteCodes() {
    try {
      const invitesRef = collection(db, 'staffInviteCodes');
      const q = query(invitesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new AppError('Failed to fetch staff invite codes', 'staff-invite/fetch-error', error);
    }
  }

  // Admin: Get all Staff Invite Codes with pagination
  async getAllStaffInviteCodesPaginated(limitCount = 10, lastDoc = null) {
    try {
      const invitesRef = collection(db, 'staffInviteCodes');
      let q;

      if (lastDoc) {
        q = query(
          invitesRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      } else {
        q = query(invitesRef, orderBy('createdAt', 'desc'), limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const codes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        codes,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        hasMore: querySnapshot.docs.length === limitCount
      };
    } catch (error) {
      throw new AppError('Failed to fetch staff invite codes', 'staff-invite/fetch-error', error);
    }
  }

  /**
   * Get total counts for OTP tables using aggregation - only 3 reads total
   */
  async getOTPCounts() {
    try {
      const [clientSnap, staffSnap, cctvSnap] = await Promise.all([
        getCountFromServer(query(collection(db, 'clientOTPs'))),
        getCountFromServer(query(collection(db, 'staffInviteCodes'))),
        getCountFromServer(query(collection(db, 'cctvOperatorOTPs'))),
      ]);
      return {
        clientTotal: clientSnap.data().count,
        staffTotal: staffSnap.data().count,
        cctvTotal: cctvSnap.data().count,
      };
    } catch (error) {
      console.warn('Could not get OTP counts:', error);
      return { clientTotal: 0, staffTotal: 0, cctvTotal: 0 };
    }
  }

  // ==================== CCTV OPERATOR ACCESS CODE METHODS ====================

  // Generate a CCTV Operator access code
  generateCCTVOperatorCode() {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const year = new Date().getFullYear();
    return `CCTV-${year}-${randomPart}`;
  }

  // Admin: Create a new CCTV Operator access code (cross-scheme, no scheme restriction)
  async createCCTVOperatorCode(schemeId, schemeName, adminUid, expiresInDays = 30) {
    try {
      const code = this.generateCCTVOperatorCode();
      const codeRef = doc(db, 'cctvOperatorOTPs', code);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      await setDoc(codeRef, {
        code,
        schemeId,
        schemeName,
        isUsed: false,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        expiresAt,
        usedBy: null,
        usedAt: null
      });

      return code;
    } catch (error) {
      throw new AppError('Failed to create CCTV operator access code', 'otp/create-error', error);
    }
  }

  // Validate CCTV Operator access code during signup
  async validateCCTVOperatorCode(code) {
    try {
      const codeRef = doc(db, 'cctvOperatorOTPs', code);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        throw new AppError('Invalid CCTV operator access code', 'otp/invalid-code');
      }

      const codeData = codeSnap.data();

      if (codeData.isUsed) {
        throw new AppError('This access code has already been used', 'otp/already-used');
      }

      const expiresAt = codeData.expiresAt?.toDate ? codeData.expiresAt.toDate() : codeData.expiresAt ? new Date(codeData.expiresAt) : null;
      if (expiresAt && expiresAt < new Date()) {
        throw new AppError('This access code has expired', 'otp/expired');
      }

      return { isValid: true, schemeId: codeData.schemeId, schemeName: codeData.schemeName };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to validate CCTV operator code', 'otp/validation-error', error);
    }
  }

  // Mark CCTV Operator access code as used after successful registration
  async markCCTVOperatorCodeAsUsed(code, uid) {
    try {
      const codeRef = doc(db, 'cctvOperatorOTPs', code);
      await updateDoc(codeRef, {
        isUsed: true,
        usedBy: uid,
        usedAt: serverTimestamp()
      });
    } catch (error) {
      throw new AppError('Failed to mark CCTV operator code as used', 'otp/update-error', error);
    }
  }

  // Admin: Get all CCTV operator codes with pagination
  async getCCTVOperatorCodesPaginated(limitCount = 10, lastDoc = null) {
    try {
      const codesRef = collection(db, 'cctvOperatorOTPs');
      let q;

      if (lastDoc) {
        q = query(codesRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(limitCount));
      } else {
        q = query(codesRef, orderBy('createdAt', 'desc'), limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const codes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        codes,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
        hasMore: querySnapshot.docs.length === limitCount
      };
    } catch (error) {
      throw new AppError('Failed to fetch CCTV operator codes', 'otp/fetch-error', error);
    }
  }

  // Admin: Get available (unused/valid) Staff Invite Codes
  async getAvailableStaffInviteCodes() {
    try {
      const invitesRef = collection(db, 'staffInviteCodes');
      const q = query(
        invitesRef,
        where('isUsed', '==', false),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      // Filter out expired codes
      const now = new Date();
      return querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(invite => {
          const expiresAt = invite.expiresAt?.toDate();
          return !expiresAt || expiresAt > now;
        });
    } catch (error) {
      throw new AppError('Failed to fetch available staff invite codes', 'staff-invite/fetch-error', error);
    }
  }

}

export const otpService = new OTPService();
