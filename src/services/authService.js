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
import { auth } from '../config/firebase';
import { firestoreService } from './firestoreService';
import { otpService } from './otpService';
import { AppError } from '../utils/errorHandling';
import { USER_ROLES } from '../utils/constants';

class AuthService {
  googleProvider = new GoogleAuthProvider();

  async signUpWithEmail(email, password, userData) {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: userData.displayName });

      // Send verification email
      await sendEmailVerification(user);

      // Create Firestore user document
      await firestoreService.createUserDocument(user.uid, {
        ...userData,
        email,
        emailVerified: false,
        metadata: {
          signInMethod: 'email',
          ipAddress: null,
          userAgent: navigator.userAgent
        }
      });

      return user;
    } catch (error) {
      throw new AppError(error.message, error.code, error);
    }
  }

  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await firestoreService.updateLastLogin(userCredential.user.uid);
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

      await firestoreService.updateLastLogin(user.uid);
      return { user, isNewUser: false };
    } catch (error) {
      throw new AppError(error.message, error.code, error);
    }
  }

  async signOut() {
    try {
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

  async signUpClientWithOTP(email, password, userData, otpCode) {
    try {
      // Validate OTP code first
      console.log('Validating OTP code:', otpCode);
      const otpValidation = await otpService.validateOTP(otpCode);
      console.log('OTP validation result:', otpValidation);

      if (!otpValidation.isValid) {
        throw new AppError('Invalid OTP code', 'auth/invalid-otp');
      }

      // Create Firebase Auth user
      console.log('Creating Firebase user with email:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created successfully:', user.uid);

      // Update display name
      await updateProfile(user, { displayName: userData.displayName });

      // Send verification email
      await sendEmailVerification(user);

      // Create Firestore user document with scheme info
      await firestoreService.createUserDocument(user.uid, {
        ...userData,
        email,
        role: USER_ROLES.CLIENT,
        schemeId: otpValidation.schemeId,
        schemeName: otpValidation.schemeName,
        emailVerified: false,
        metadata: {
          signInMethod: 'email',
          ipAddress: null,
          userAgent: navigator.userAgent,
          otpCode: otpCode
        }
      });

      // Mark OTP as used (non-blocking - don't fail signup if this fails)
      try {
        await otpService.markOTPAsUsed(otpCode, user.uid);
      } catch (otpError) {
        console.warn('Failed to mark OTP as used, but signup succeeded:', otpError);
        // Don't throw - the user is already created
      }

      return user;
    } catch (error) {
      console.error('SignUpClientWithOTP Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw new AppError(error.message, error.code, error);
    }
  }
}


export const authService = new AuthService();
