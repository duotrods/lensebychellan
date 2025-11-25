import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { USER_ROLES } from '../utils/constants';
import { AppError } from '../utils/errorHandling';

class FirestoreService {
  async createUserDocument(uid, userData) {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        uid,
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        canCreateAdmins: false // Default false, manually set in Firestore for super admin
      });
    } catch (error) {
      throw new AppError('Failed to create user document', 'firestore/create-error', error);
    }
  }

  async getUserDocument(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      return userSnap.exists() ? userSnap.data() : null;
    } catch (error) {
      throw new AppError('Failed to fetch user document', 'firestore/read-error', error);
    }
  }

  async updateLastLogin(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to update last login:', error);
      // Non-critical, don't throw
    }
  }

  async updateUserProfile(uid, updates) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw new AppError('Failed to update profile', 'firestore/update-error', error);
    }
  }

  async updateEmailVerificationStatus(uid, isVerified) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        emailVerified: isVerified,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to update email verification:', error);
    }
  }

  // Admin-only: Get all users
  async getAllUsers() {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      throw new AppError('Failed to fetch users', 'firestore/read-error', error);
    }
  }

  // Admin-only: Update staff role
  async updateUserRole(targetUid, newRole, adminUid) {
    try {
      const targetUserRef = doc(db, 'users', targetUid);
      const targetUser = await getDoc(targetUserRef);

      if (!targetUser.exists()) {
        throw new AppError('User not found', 'firestore/not-found');
      }

      // Verify target is staff
      if (targetUser.data().role !== USER_ROLES.STAFF) {
        throw new AppError('Can only modify staff roles', 'firestore/permission-denied');
      }

      await updateDoc(targetUserRef, {
        role: newRole,
        updatedAt: serverTimestamp()
      });

      // Log audit trail
      await this.createAuditLog({
        action: 'role_change',
        performedBy: adminUid,
        targetUser: targetUid,
        oldValue: targetUser.data().role,
        newValue: newRole
      });
    } catch (error) {
      throw new AppError('Failed to update role', 'firestore/update-error', error);
    }
  }

  async createAuditLog(logData) {
    try {
      const logsRef = collection(db, 'auditLogs');
      await setDoc(doc(logsRef), {
        ...logData,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}

export const firestoreService = new FirestoreService();
