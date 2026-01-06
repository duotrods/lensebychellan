import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { USER_ROLES } from '../utils/constants';
import { AppError } from '../utils/errorHandling';

class FirestoreService {
  async createUserDocument(uid, userData) {
    try {
      const userRef = doc(db, 'users', uid);

      // Transform single scheme to array format for multi-scheme support
      const docData = {
        uid,
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
        canCreateAdmins: false // Default false, manually set in Firestore for super admin
      };

      // If this is a client user with schemeId, convert to multi-scheme format
      if (userData.role === USER_ROLES.CLIENT && userData.schemeId) {
        docData.schemeIds = [userData.schemeId];
        docData.schemeNames = {
          [userData.schemeId]: userData.schemeName
        };
        docData.activeSchemeId = userData.schemeId;
        // Keep old fields for backward compatibility
        docData.schemeId = userData.schemeId;
        docData.schemeName = userData.schemeName;
      }

      await setDoc(userRef, docData);
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

  // Admin-only: Get paginated users
  async getUsersPaginated(limitCount = 50, lastDoc = null) {
    try {
      const usersRef = collection(db, 'users');

      // Build query with pagination
      let q;
      if (lastDoc) {
        // Get next page
        q = query(
          usersRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      } else {
        // Get first page
        q = query(
          usersRef,
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const snapshot = await getDocs(q);

      // Get total count (for page calculation)
      const totalSnapshot = await getDocs(usersRef);
      const total = totalSnapshot.size;

      const users = snapshot.docs.map(doc => doc.data());
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      return {
        users,
        total,
        lastDoc: lastVisible,
        hasMore: snapshot.docs.length === limitCount
      };
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
      await addDoc(logsRef, {
        ...logData,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  // Admin-only: Assign scheme to user
  async assignSchemeToUser(userId, schemeId, schemeName, adminUid) {
    try {
      // Verify admin role
      const adminUser = await this.getUserDocument(adminUid);
      if (adminUser?.role !== USER_ROLES.ADMIN) {
        throw new AppError('Unauthorized', 'firestore/permission-denied');
      }

      // Get target user
      const targetUser = await this.getUserDocument(userId);
      if (!targetUser) {
        throw new AppError('User not found', 'firestore/not-found');
      }

      // Verify target is a client
      if (targetUser.role !== USER_ROLES.CLIENT) {
        throw new AppError('Can only assign schemes to client users', 'firestore/permission-denied');
      }

      // Check if scheme already assigned
      const currentSchemes = targetUser.schemeIds || [];
      if (currentSchemes.includes(schemeId)) {
        throw new AppError('Scheme already assigned to this user', 'firestore/already-exists');
      }

      // Update user schemes
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        schemeIds: [...currentSchemes, schemeId],
        schemeNames: {
          ...(targetUser.schemeNames || {}),
          [schemeId]: schemeName
        },
        // If this is the first scheme, set it as active
        ...(currentSchemes.length === 0 && { activeSchemeId: schemeId }),
        updatedAt: serverTimestamp()
      });

      // Log audit trail
      await this.createAuditLog({
        action: 'scheme_assigned',
        performedBy: adminUid,
        targetUser: userId,
        schemeId: schemeId,
        schemeName: schemeName
      });

      return { success: true, message: 'Scheme assigned successfully' };
    } catch (error) {
      console.error('assignSchemeToUser error:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to assign scheme', 'firestore/update-error', error);
    }
  }

  // Admin-only: Remove scheme from user
  async removeSchemeFromUser(userId, schemeId, adminUid) {
    try {
      // Verify admin role
      const adminUser = await this.getUserDocument(adminUid);
      if (adminUser?.role !== USER_ROLES.ADMIN) {
        throw new AppError('Unauthorized', 'firestore/permission-denied');
      }

      // Get target user
      const targetUser = await this.getUserDocument(userId);
      if (!targetUser) {
        throw new AppError('User not found', 'firestore/not-found');
      }

      // Check if user has multiple schemes
      const currentSchemes = targetUser.schemeIds || [];
      if (currentSchemes.length <= 1) {
        throw new AppError('Cannot remove the only scheme from a user', 'firestore/invalid-operation');
      }

      // Remove scheme from arrays
      const updatedSchemes = currentSchemes.filter(id => id !== schemeId);
      const updatedSchemeNames = { ...(targetUser.schemeNames || {}) };
      delete updatedSchemeNames[schemeId];

      // Update user document
      const userRef = doc(db, 'users', userId);
      const updateData = {
        schemeIds: updatedSchemes,
        schemeNames: updatedSchemeNames,
        updatedAt: serverTimestamp()
      };

      // If removing the active scheme, set new active scheme
      if (targetUser.activeSchemeId === schemeId) {
        updateData.activeSchemeId = updatedSchemes[0];
      }

      await updateDoc(userRef, updateData);

      // Log audit trail
      await this.createAuditLog({
        action: 'scheme_removed',
        performedBy: adminUid,
        targetUser: userId,
        schemeId: schemeId
      });

      return { success: true, message: 'Scheme removed successfully' };
    } catch (error) {
      throw new AppError('Failed to remove scheme', 'firestore/update-error', error);
    }
  }

  // Admin-only: Promote staff to admin
  async promoteToAdmin(targetUid, adminUid) {
    try {
      // Verify admin role
      const adminUser = await this.getUserDocument(adminUid);
      if (adminUser?.role !== USER_ROLES.ADMIN) {
        throw new AppError('Unauthorized', 'firestore/permission-denied');
      }

      // Get target user
      const targetUser = await this.getUserDocument(targetUid);
      if (!targetUser) {
        throw new AppError('User not found', 'firestore/not-found');
      }

      // Verify target is staff
      if (targetUser.role !== USER_ROLES.STAFF) {
        throw new AppError('Can only promote staff users to admin', 'firestore/permission-denied');
      }

      // Prevent self-promotion
      if (targetUid === adminUid) {
        throw new AppError('Cannot promote yourself', 'firestore/invalid-operation');
      }

      // Update user role to admin
      const userRef = doc(db, 'users', targetUid);
      await updateDoc(userRef, {
        role: USER_ROLES.ADMIN,
        updatedAt: serverTimestamp()
      });

      // Log audit trail
      await this.createAuditLog({
        action: 'promote_to_admin',
        performedBy: adminUid,
        targetUser: targetUid,
        oldValue: USER_ROLES.STAFF,
        newValue: USER_ROLES.ADMIN,
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.displayName
      });

      return { success: true, message: 'User promoted to admin successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to promote user', 'firestore/update-error', error);
    }
  }

  // Admin-only: Delete user
  async deleteUser(targetUid, adminUid) {
    try {
      // Verify admin role
      const adminUser = await this.getUserDocument(adminUid);
      if (adminUser?.role !== USER_ROLES.ADMIN) {
        throw new AppError('Unauthorized', 'firestore/permission-denied');
      }

      // Get target user
      const targetUser = await this.getUserDocument(targetUid);
      if (!targetUser) {
        throw new AppError('User not found', 'firestore/not-found');
      }

      // Prevent deleting other admins
      if (targetUser.role === USER_ROLES.ADMIN) {
        throw new AppError('Cannot delete admin users', 'firestore/permission-denied');
      }

      // Prevent self-deletion
      if (targetUid === adminUid) {
        throw new AppError('Cannot delete yourself', 'firestore/invalid-operation');
      }

      // Log audit trail before deletion
      await this.createAuditLog({
        action: 'user_deleted',
        performedBy: adminUid,
        targetUser: targetUid,
        deletedUserData: {
          email: targetUser.email,
          displayName: targetUser.displayName,
          role: targetUser.role,
          company: targetUser.company
        }
      });

      // Delete user document from Firestore
      const userRef = doc(db, 'users', targetUid);
      await deleteDoc(userRef);

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Delete user error details:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `Failed to delete user: ${error.message || 'Unknown error'}`,
        'firestore/delete-error',
        error
      );
    }
  }
}

export const firestoreService = new FirestoreService();
