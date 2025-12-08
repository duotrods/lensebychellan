import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  orderBy
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
  async createOTP(schemeId, schemeName, adminUid) {
    try {
      const otpCode = this.generateOTPCode(schemeId);
      const otpRef = doc(db, 'clientOTPs', otpCode);

      await setDoc(otpRef, {
        otpCode,
        schemeId,
        schemeName,
        isUsed: false,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
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
}

export const otpService = new OTPService();
