import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../data/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('sq'); // Default to Albanian

  useEffect(() => {
    // Load saved language preference
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('user-language');
        if (savedLanguage) {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };
    loadLanguage();
  }, []);

  const changeLanguage = async (newLang) => {
    setLanguage(newLang);
    try {
      await AsyncStorage.setItem('user-language', newLang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['sq']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
