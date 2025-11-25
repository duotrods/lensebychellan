import { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { firestoreService } from '../services/firestoreService';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);

        if (user) {
          // Fetch Firestore user profile
          const profile = await firestoreService.getUserDocument(user.uid);
          setUserProfile(profile);

          // Sync email verification status
          if (user.emailVerified && profile && !profile.emailVerified) {
            await firestoreService.updateEmailVerificationStatus(user.uid, true);
            setUserProfile(prev => ({ ...prev, emailVerified: true }));
          }
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    isAuthenticated: !!currentUser,
    isEmailVerified: currentUser?.emailVerified || false,
    role: userProfile?.role || null
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
