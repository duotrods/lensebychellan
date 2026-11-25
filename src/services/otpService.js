import {
  collection,
  doc,
  setDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppError } from '../utils/errorHandling';

// Secure random part of an access code: 10 chars from a 32-letter alphabet (50 bits).
// No 0/O/1/I so codes read out over the phone are unambiguous.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCodePart = (length = 10) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length)), (b) => CODE_ALPHABET[b % 32]).join('');

class OTPService {
  // Generate a random OTP code
  generateOTPCode(schemeId) {
    const randomPart = randomCodePart();
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
    const randomPart = randomCodePart();
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
    const randomPart = randomCodePart();
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

  // ==================== THIRD-PARTY INVITE CODE METHODS ====================

  // Generate third-party operator access code
  generateThirdPartyOperatorCode() {
    const randomPart = randomCodePart();
    const year = new Date().getFullYear();
    return `TPOP-${year}-${randomPart}`;
  }

  // Generate third-party client access code
  generateThirdPartyClientCode() {
    const randomPart = randomCodePart();
    const year = new Date().getFullYear();
    return `TPCL-${year}-${randomPart}`;
  }

  // Generate third-party live operator access code
  generateThirdPartyLiveOperatorCode() {
    const randomPart = randomCodePart();
    const year = new Date().getFullYear();
    return `TPLIVE-${year}-${randomPart}`;
  }

  // Generate third-party CCTV operator access code
  generateThirdPartyCCTVOperatorCode() {
    const randomPart = randomCodePart();
    const year = new Date().getFullYear();
    return `TPCCTV-${year}-${randomPart}`;
  }

  // ==================== THIRD-PARTY OPERATOR CODE METHODS ====================

  async createThirdPartyOperatorCode(company, adminUid, expiresInDays = 30) {
    try {
      const code = this.generateThirdPartyOperatorCode();
      const codeRef = doc(db, 'thirdPartyOperatorCodes', code);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      await setDoc(codeRef, {
        code, company, isUsed: false,
        createdBy: adminUid, createdAt: serverTimestamp(),
        expiresAt, usedBy: null, usedAt: null
      });
      return code;
    } catch (error) {
      throw new AppError('Failed to create third party operator code', 'otp/create-error', error);
    }
  }

  // ==================== THIRD-PARTY CLIENT CODE METHODS ====================

  async createThirdPartyClientCode(schemeId, schemeName, adminUid, expiresInDays = 30) {
    try {
      const code = this.generateThirdPartyClientCode();
      const codeRef = doc(db, 'thirdPartyClientCodes', code);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      await setDoc(codeRef, {
        code, schemeId, schemeName, isUsed: false,
        createdBy: adminUid, createdAt: serverTimestamp(),
        expiresAt, usedBy: null, usedAt: null
      });
      return code;
    } catch (error) {
      throw new AppError('Failed to create third party client code', 'otp/create-error', error);
    }
  }

  // ==================== THIRD-PARTY LIVE OPERATOR CODE METHODS ====================

  async createThirdPartyLiveOperatorCode(company, adminUid, expiresInDays = 30) {
    try {
      const code = this.generateThirdPartyLiveOperatorCode();
      const codeRef = doc(db, 'thirdPartyLiveOperatorCodes', code);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      await setDoc(codeRef, {
        code, company, isUsed: false,
        createdBy: adminUid, createdAt: serverTimestamp(),
        expiresAt, usedBy: null, usedAt: null
      });
      return code;
    } catch (error) {
      throw new AppError('Failed to create third party live operator code', 'otp/create-error', error);
    }
  }

  // ==================== THIRD-PARTY CCTV OPERATOR CODE METHODS ====================

  async createThirdPartyCCTVOperatorCode(schemeId, schemeName, adminUid, expiresInDays = 30) {
    try {
      const code = this.generateThirdPartyCCTVOperatorCode();
      const codeRef = doc(db, 'thirdPartyCCTVOperatorCodes', code);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      await setDoc(codeRef, {
        code, schemeId, schemeName, isUsed: false,
        createdBy: adminUid, createdAt: serverTimestamp(),
        expiresAt, usedBy: null, usedAt: null
      });
      return code;
    } catch (error) {
      throw new AppError('Failed to create third party CCTV operator code', 'otp/create-error', error);
    }
  }

  // ==================== THIRD-PARTY CODE LISTING / DELETION ====================
  // Shared across all four thirdParty*Codes collections (doc ID is the code).

  async getThirdPartyCodesPaginated(collectionName, limitCount = 10, lastDoc = null) {
    try {
      const codesRef = collection(db, collectionName);
      const q = lastDoc
        ? query(codesRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(limitCount))
        : query(codesRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return {
        codes: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limitCount,
      };
    } catch (error) {
      throw new AppError('Failed to load third party codes', 'otp/list-error', error);
    }
  }

  async deleteThirdPartyCode(collectionName, code) {
    try {
      await deleteDoc(doc(db, collectionName, code));
    } catch (error) {
      throw new AppError('Failed to delete third party code', 'otp/delete-error', error);
    }
  }
}

export const otpService = new OTPService();
