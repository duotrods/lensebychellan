const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Callable function to delete a user from both Authentication and Firestore
 * This function can only be called by authenticated admin users
 */
exports.deleteUserAccount = onCall(async (request) => {
  // Check if the request is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to call this function'
    );
  }

  const { targetUid } = request.data;
  const callerUid = request.auth.uid;

  try {
    // Get the caller's Firestore document to verify admin role
    const callerDoc = await admin.firestore()
      .collection('users')
      .doc(callerUid)
      .get();

    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Only admins can delete users'
      );
    }

    // Get target user document
    const targetUserDoc = await admin.firestore()
      .collection('users')
      .doc(targetUid)
      .get();

    if (!targetUserDoc.exists) {
      throw new HttpsError(
        'not-found',
        'Target user not found in Firestore'
      );
    }

    const targetUserData = targetUserDoc.data();

    // Prevent deletion of admin users
    if (targetUserData.role === 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Cannot delete admin users'
      );
    }

    // Prevent self-deletion
    if (targetUid === callerUid) {
      throw new HttpsError(
        'invalid-argument',
        'Cannot delete yourself'
      );
    }

    // Create audit log before deletion
    await admin.firestore().collection('auditLogs').add({
      action: 'user_deleted',
      performedBy: callerUid,
      targetUser: targetUid,
      deletedUserData: {
        email: targetUserData.email,
        displayName: targetUserData.displayName,
        role: targetUserData.role,
        company: targetUserData.company
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(targetUid);
      console.log(`Successfully deleted auth user: ${targetUid}`);
    } catch (authError) {
      console.error('Error deleting from Auth:', authError);
      // If user doesn't exist in Auth, continue with Firestore deletion
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    // Delete from Firestore
    await admin.firestore()
      .collection('users')
      .doc(targetUid)
      .delete();

    console.log(`Successfully deleted user document: ${targetUid}`);

    return {
      success: true,
      message: `User ${targetUserData.displayName} has been completely deleted`
    };

  } catch (error) {
    console.error('Delete user error:', error);

    // If it's already an HttpsError, rethrow it
    if (error instanceof HttpsError) {
      throw error;
    }

    // Otherwise, wrap it in an HttpsError
    throw new HttpsError(
      'internal',
      `Failed to delete user: ${error.message}`
    );
  }
});
