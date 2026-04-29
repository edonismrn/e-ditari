import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Custom storage adapter to handle sessionStorage on Web (logout on tab close)
const customStorage = {
  getItem: (key) => {
    if (Platform.OS === 'web') {
      return sessionStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key, value) => {
    if (Platform.OS === 'web') {
      sessionStorage.setItem(key, value);
    } else {
      AsyncStorage.setItem(key, value);
    }
  },
  removeItem: (key) => {
    if (Platform.OS === 'web') {
      sessionStorage.removeItem(key);
    } else {
      AsyncStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Client used for Admin actions (creating users) without affecting current session
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
