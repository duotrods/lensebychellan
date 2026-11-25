import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, functions } from '../config/firebase';
import { firestoreService } from './firestoreService';
import { AppError } from '../utils/errorHandling';
import { httpsCallable } from 'firebase/functions';

class AuthService {
  googleProvider = new GoogleAuthProvider();

  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      firestoreService.updateLastLogin(userCredential.user.uid).catch(() => {});
      return userCredential.user;
    } catch (error) {
      throw new AppError(error.message, error.code, error);
    }
  }

  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, this.googleProvider);
      const user = result.user;

      // Check if user document exists
      const userDoc = await firestoreService.getUserDocument(user.uid);

      if (!userDoc) {
        // First-time Google sign-in, need to select role
        return { user, isNewUser: true };
      }

      firestoreService.updateLastLogin(user.uid).catch(() => {});
      return { user, isNewUser: false };
    } catch (error) {
      throw new AppError(error.message, error.code, error);
    }
  }

  async signOut() {
    try {
      // Save logout time BEFORE signing out (auth.currentUser becomes null after)
      const uid = auth.currentUser?.uid;
      if (uid) {
        await firestoreService.updateLastLogout(uid);
      }
      // Clear session storage to reset notice board + security warning for next login
      sessionStorage.removeItem('hasSeenNoticeBoard');
      sessionStorage.removeItem('hasSeenSecurityWarning');
      // Clear redirect to prevent redirecting to role-specific pages on next login
      window.history.replaceState({}, '', '/signin');
      await signOut(auth);
    } catch (error) {
      throw new AppError(error.message, error.code, error);
    }
  }

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new AppError(error.message, error.code, error);
    }
  }

  async resendVerificationEmail() {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      }
    } catch (error) {
      throw new AppError(error.message, error.code, error);
    }
  }

  // Every account needs an access code for its role. The code is checked and the
  // user doc written by the `registerWithCode` Cloud Function (never by the browser),
  // so the role cannot be chosen by the user. If the code is refused we delete the
  // brand-new Auth user so the email can be used again.
  async signUpWithCode(email, password, userData, role, code) {
    let user = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      await updateProfile(user, { displayName: userData.displayName });
      await httpsCallable(functions, 'registerWithCode')({
        role,
        code,
        displayName: userData.displayName,
        company: userData.company,
        phone: userData.phone,
      });
      await sendEmailVerification(user);
      return user;
    } catch (error) {
      if (user) await user.delete().catch(() => {});
      throw new AppError(error.message, error.code, error);
    }
  }
}


export const authService = new AuthService();
