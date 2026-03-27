import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import { Lock, X, CheckCircle2, AlertCircle } from 'lucide-react-native';

const PasswordChangeModal = ({ 
  visible, 
  onClose, 
  onUpdate, 
  t 
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('fill_all_fields') || 'Ju lutem mbushni të gjitha fushat');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwords_dont_match') || 'Fjalëkalimet nuk përputhen');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onUpdate(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? (t('invalid_current_password') || 'Fjalëkalimi aktual nuk është i saktë') : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.container}
            >
              <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    <Lock size={24} color="#2563eb" />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.title}>{t('change_password')}</Text>
                    <Text style={styles.subtitle}>{t('password_subtitle') || 'Siguroni llogarinë tuaj me një fjalëkalim të ri'}</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  {error ? (
                    <View style={styles.errorBanner}>
                      <AlertCircle size={16} color="#ef4444" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('current_password') || 'Fjalëkalimi Aktual'}</Text>
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={(val) => {
                        setCurrentPassword(val);
                        if (error) setError('');
                      }}
                      secureTextEntry
                      placeholder={t('current_password_placeholder') || '••••••••'}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('new_password')}</Text>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={(val) => {
                        setNewPassword(val);
                        if (error) setError('');
                      }}
                      secureTextEntry
                      placeholder={t('password_placeholder') || '••••••••'}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('confirm_password')}</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val);
                        if (error) setError('');
                      }}
                      secureTextEntry
                      placeholder={t('confirm_password_placeholder') || '••••••••'}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={onClose}
                  >
                    <Text style={styles.secondaryButtonText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.primaryButton, loading && styles.primaryButtonDisabled]} 
                    onPress={handleUpdate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <CheckCircle2 size={18} color="#fff" />
                        <Text style={styles.primaryButtonText}>{t('confirm')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  form: {
    padding: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 0,
    gap: 12,
  },
  primaryButton: {
    flex: 2,
    height: 52,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PasswordChangeModal;
