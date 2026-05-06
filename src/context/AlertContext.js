import React, { createContext, useState, useContext, useCallback } from 'react';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    message: '',
    type: 'error', // 'error', 'success', 'info'
    title: ''
  });

  const [confirmConfig, setConfirmConfig] = useState({
    visible: false,
    message: '',
    title: '',
    onConfirm: () => {},
    onCancel: () => {},
    confirmText: 'Po',
    cancelText: 'Jo'
  });

  const showAlert = useCallback((message, type = 'error', title = null) => {
    setAlertConfig({
      visible: true,
      message,
      type,
      title: title || (type === 'error' ? 'Gabim' : type === 'success' ? 'Sukses' : 'Lajmërim')
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  const showConfirm = useCallback((message, onConfirm, title = 'Konfirmim', confirmText = 'Po', cancelText = 'Jo', onCancel = null) => {
    setConfirmConfig({
      visible: true,
      message,
      title,
      onConfirm,
      onCancel: onCancel || (() => {}),
      confirmText,
      cancelText
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmConfig(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ 
      showAlert, 
      hideAlert, 
      alertConfig,
      showConfirm,
      hideConfirm,
      confirmConfig
    }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
