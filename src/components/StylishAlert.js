import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated, Dimensions } from 'react-native';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react-native';
import { useAlert } from '../context/AlertContext';

const { width } = Dimensions.get('window');

const StylishAlert = () => {
  const { alertConfig, hideAlert } = useAlert();
  const { visible, message, type, title } = alertConfig;

  if (!visible && message === '') return null;

  const getTheme = () => {
    switch (type) {
      case 'success':
        return {
          color: '#10b981',
          bg: '#ecfdf5',
          icon: CheckCircle
        };
      case 'info':
        return {
          color: '#3b82f6',
          bg: '#eff6ff',
          icon: Info
        };
      case 'error':
      default:
        return {
          color: '#ef4444',
          bg: '#fef2f2',
          icon: AlertCircle
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <View style={[styles.iconContainer, { backgroundColor: theme.bg }]}>
            <Icon size={32} color={theme.color} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.color }]} 
            onPress={hideAlert}
          >
            <Text style={styles.buttonText}>Në rregull</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: Math.min(width - 40, 360),
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default StylishAlert;
