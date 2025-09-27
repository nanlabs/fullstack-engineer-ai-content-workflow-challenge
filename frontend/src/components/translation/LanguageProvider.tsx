"use client";

import React, { createContext, useContext, useState } from 'react';

interface LanguageContextType {
  userLanguage: string;
  setUserLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLanguage, setUserLanguage] = useState("en"); // Default to English

  return (
    <LanguageContext.Provider value={{ userLanguage, setUserLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
