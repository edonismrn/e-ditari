import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        if (err?.message && err.message.includes('Refresh Token')) {
          console.log("[AuthContext] Normal session expiry (Refresh Token Not Found).");
        } else {
          console.warn("[AuthContext] getSession error on mount:", err);
        }
        // Force cleanup on invalid refresh token or other auth errors
        supabase.auth.signOut().catch(() => {});
        setLoading(false);
      });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        setUser(null);
        setLoading(false);
        return;
      } else if (event === 'TOKEN_REFRESHED') {
        // Token was refreshed successfully — nothing extra needed
      }

      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        // No session (could be expired refresh token on iOS)
        setUser(null);
        setLoading(false);
      }
    });

    // On iOS the app can be backgrounded for a long time and the token expires.
    // When the app comes back to the foreground, force a session refresh so Supabase
    // can detect the invalid token early and emit SIGNED_OUT instead of crashing later.
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        supabase.auth.getSession()
          .then(({ data: { session } }) => {
            if (session) setSession(session);
          })
          .catch(err => {
            if (err?.message && err.message.includes('Refresh Token')) {
              console.log("[AuthContext] Session expired on foreground (Refresh Token Not Found).");
            } else {
              console.warn("[AuthContext] getSession error on foreground:", err);
            }
            // If getSession fails due to invalid refresh token, sign out cleanly
            supabase.auth.signOut().catch(() => {});
            setUser(null);
          });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        // If profile not found, don't throw yet, check if it's just a delay in creation
        if (profileError.code === 'PGRST116') {
          console.warn('[fetchUserProfile] Profile not found yet (race condition during creation ok)');
          return; 
        }
        throw profileError;
      }

      // Check if user is active (except for admins)
      if (profile.role !== 'admin' && profile.is_active === false) {
        await supabase.auth.signOut();
        throw new Error("Llogaria juaj nuk është aktive. Ju lutem kontaktoni administratorin për të përfunduar konfigurimin e klasës tuaj.");
      }

      // Check if the school is active
      const isSuperAdmin = (profile.role === 'admin' && !profile.school_id) || profile.is_super_admin === true || profile.email?.toLowerCase().trim() === 'admin@ditari-elektronik.com';
      if (!isSuperAdmin && profile.schools && profile.schools.is_active === false) {
        await supabase.auth.signOut();
        throw new Error("Shkolla juaj momentalisht është e çaktivizuar. Ju lutem kontaktoni administratorin suprem.");
      }
      
      setUser(profile);
    } catch (error) {
      // PGRST116 errors are now caught above, so this block handles real errors
      console.error('Error fetching user profile:', error);
      // If there's an error fetching profile or user is inactive, ensure user is logged out
      if (error.message.includes("Llogaria juaj nuk është aktive")) {
        await supabase.auth.signOut();
      }
      setUser(null); // Clear user state on error
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Auto-register for easy dev testing if they don't exist
    if (error && error.message.includes('Invalid login credentials')) {
      console.log('User not found, attempting auto-registration for development...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (!signUpError && signUpData.user) {
        // Create matching profile
        await supabase.from('profiles').insert({
          id: signUpData.user.id,
          email,
          first_name: 'Admin',
          role: email.includes('admin') ? 'admin' : 'mesues'
        });
        return signUpData;
      }
      throw signUpError || error;
    }
    
    if (error) throw error;

    // Fetch profile immediately to return it for role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, schools(*)')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return { ...data, profile };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return { success: true };
  };

  const verifyResetOtp = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (error) throw error;
    
    // Setting recovery state manually here so UI knows to show "Change Password" 
    // instead of logging the user directly into dashboard.
    setIsPasswordRecovery(true);
    return { success: true };
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setIsPasswordRecovery(false);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, login, logout, 
      resetPassword, verifyResetOtp, updatePassword, isPasswordRecovery 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
