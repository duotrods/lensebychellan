import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { firestoreService } from '../services/firestoreService';
import { schemeService } from '../services/schemeService';
import { setSchemes } from '../utils/schemes';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schemesVersion, setSchemesVersion] = useState(0);
  const [schemesLoaded, setSchemesLoaded] = useState(false);
  const profileUnsubRef = useRef(null);

  // Schemes: start from the last list this browser saw, then refresh from Firestore
  // after login. An empty or failed load keeps the static list from schemes.js.
  useEffect(() => {
    const cached = schemeService.readCache();
    if (cached && setSchemes(cached)) setSchemesVersion((v) => v + 1);
  }, []);

  // Fetch the scheme list and apply it. Resolves once settled; failures keep the
  // cached/static list. Also used by the admin page after it edits schemes.
  const refreshSchemes = useCallback(async () => {
    try {
      const docs = await schemeService.listSchemes();
      schemeService.writeCache(docs);
      if (setSchemes(docs)) setSchemesVersion((v) => v + 1);
    } catch {
      // fall back to cached/static schemes
    }
  }, []);

  // Pages wait for the first load so they never render a stale list. If Firestore is
  // slow or unreachable they render anyway after 3s with the cached/static schemes.
  useEffect(() => {
    if (!currentUser) {
      setSchemesLoaded(true);
      return undefined;
    }
    setSchemesLoaded(false);
    let cancelled = false;
    const settle = () => {
      if (!cancelled) setSchemesLoaded(true);
    };
    const timeout = setTimeout(settle, 3000);
    refreshSchemes().finally(() => {
      clearTimeout(timeout);
      settle();
    });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [currentUser?.uid, refreshSchemes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      // Cancel any previous profile listener
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      try {
        setCurrentUser(user);

        if (user) {
          // Fetch once to check archived status before starting live listener
          const profile = await firestoreService.getUserDocument(user.uid);

          if (profile?.isArchived) {
            await auth.signOut();
            setCurrentUser(null);
            setUserProfile(null);
            setError(new Error('Your account has been archived. Please contact an administrator.'));
            setLoading(false);
            return;
          }

          setUserProfile(profile);

          // Sync email verification status — fire and forget, non-critical
          if (user.emailVerified && profile && !profile.emailVerified) {
            firestoreService.updateEmailVerificationStatus(user.uid, true).catch(() => {});
            setUserProfile(prev => ({ ...prev, emailVerified: true }));
          }

          // Start live listener — auto-syncs role/scheme/profile changes without reload
          profileUnsubRef.current = onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => {
              if (snap.exists()) {
                const updated = { id: snap.id, ...snap.data() };
                // If admin archives this user mid-session, sign them out
                if (updated.isArchived) {
                  auth.signOut();
                  return;
                }
                setUserProfile(updated);
              }
            },
            () => {} // ignore listener errors silently
          );
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

    return () => {
      unsubscribeAuth();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  // Update active scheme for multi-scheme support
  // onSnapshot will automatically pick up the change — no manual refresh needed
  const updateActiveScheme = async (schemeId) => {
    if (!currentUser) {
      throw new Error('No user is logged in');
    }
    await firestoreService.updateUserProfile(currentUser.uid, {
      activeSchemeId: schemeId
    });
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    isAuthenticated: !!currentUser,
    isEmailVerified: currentUser?.emailVerified || false,
    role: userProfile?.role || null,
    schemesVersion,
    schemesLoaded,
    refreshSchemes,
    updateActiveScheme
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
