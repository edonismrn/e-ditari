import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { School, Mail, Lock, LogIn, ArrowLeft, Languages, CheckCircle, XCircle, X } from 'lucide-react-native';
import { Modal } from 'react-native';

const { width } = Dimensions.get('window');

const LoginScreen = ({ onLogin }) => {
  const [role, setRole] = useState('mesues'); // 'mesues' or 'nxenes'
  const [schoolCode, setSchoolCode] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Password Reset State
  const { resetPassword, updatePassword, isPasswordRecovery, verifyResetOtp } = useAuth();
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState('email'); // 'email' | 'code'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = () => {
    let finalUsername = username;
    
    // Secret logic for school admins: if no @, assume it's a school code
    if (role === 'mesues' && username && !username.includes('@')) {
      finalUsername = `admin@${username.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    }

    onLogin({ role, username: finalUsername, password });
  };

  const { t, language, changeLanguage } = useLanguage();

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('error');

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleResetRequest = async () => {
    if (!resetEmail) {
      showToast(t('email_placeholder'), 'error');
      return;
    }
    try {
      await resetPassword(resetEmail);
      showToast(t('success'), 'success');
      setResetStep('code');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleVerifyCode = async () => {
    if (!resetCode) {
      showToast(t('code_placeholder'), 'error');
      return;
    }
    try {
      await verifyResetOtp(resetEmail, resetCode);
      setIsResetModalVisible(false);
      setResetStep('email');
      setResetCode('');
      setResetEmail('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };


  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      showToast(t('error'), 'error');
      return;
    }
    try {
      await updatePassword(newPassword);
      showToast(t('success'), 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      {toastMessage && (
        <View style={[styles.toastContainer, toastType === 'success' ? styles.toastSuccess : styles.toastError]}>
          {toastType === 'success' ? <CheckCircle color="white" size={20} /> : <XCircle color="white" size={20} />}
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.logoContainer, { width: 80, height: 80, borderRadius: 24, backgroundColor: '#2563eb', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 }]}>
              <School color="white" size={40} />
            </View>
            <Text style={[styles.title, { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 12 }]}>{t('welcome_title')}</Text>
          </View>

          {/* Role Switcher */}
          <View style={styles.roleSwitcher}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'mesues' && styles.activeRoleButton]}
              onPress={() => setRole('mesues')}
            >
              <Text style={[styles.roleButtonText, role === 'mesues' && styles.activeRoleButtonText]}>{t('teacher')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'nxenes' && styles.activeRoleButton]}
              onPress={() => setRole('nxenes')}
            >
              <Text style={[styles.roleButtonText, role === 'nxenes' && styles.activeRoleButtonText]}>{t('student')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('email')}</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('email_placeholder')}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('password')}</Text>
              <View style={styles.inputContainer}>
                <Lock size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleSubmit}>
              <LogIn color="white" size={20} />
              <Text style={styles.loginButtonText}>{t('login_button')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword} onPress={() => setIsResetModalVisible(true)}>
              <Text style={styles.forgotPasswordText}>{t('forgot_password')}</Text>
            </TouchableOpacity>

            {/* Language Selector */}
            <View style={[styles.languageContainer, { marginTop: 24, marginBottom: 0, justifyContent: 'center' }]}>
              <TouchableOpacity
                style={[styles.langToggle, language === 'sq' && styles.activeLang]}
                onPress={() => changeLanguage('sq')}
              >
                <Text style={[styles.langText, language === 'sq' && styles.activeLangText]}>SQ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langToggle, language === 'sr' && styles.activeLang]}
                onPress={() => changeLanguage('sr')}
              >
                <Text style={[styles.langText, language === 'sr' && styles.activeLangText]}>SR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langToggle, language === 'tr' && styles.activeLang]}
                onPress={() => changeLanguage('tr')}
              >
                <Text style={[styles.langText, language === 'tr' && styles.activeLangText]}>TR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Change Password View (Recovery State) */}
        {isPasswordRecovery && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#eff6ff', zIndex: 100 }]}>
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <Lock color="white" size={32} />
                </View>
                <Text style={styles.title}>{t('change_password_title')}</Text>
                <Text style={styles.subtitle}>{t('change_password_subtitle')}</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('new_password')}</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{t('confirm_password')}</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.loginButton} onPress={handleUpdatePassword}>
                  <Text style={styles.loginButtonText}>{t('change_password_title')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Reset Password Request Modal */}
        <Modal visible={isResetModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                  {resetStep === 'email' ? t('reset_password_title') : t('enter_code_title')}
                </Text>
                <TouchableOpacity onPress={() => setIsResetModalVisible(false)} style={styles.closeModalBtn}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {resetStep === 'email' ? (
                <>
                  <Text style={styles.modalDescription}>
                    {t('reset_password_desc')}
                  </Text>

                  <TextInput
                    style={styles.inputField}
                    placeholder={t('email_placeholder')}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => {
                      setIsResetModalVisible(false);
                      setResetStep('email');
                    }}>
                      <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitButton} onPress={handleResetRequest}>
                      <Text style={styles.submitButtonText}>{t('send_email')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.modalDescription}>
                    {t('enter_code_desc')}
                  </Text>

                  <TextInput
                    style={styles.inputField}
                    placeholder={t('code_placeholder')}
                    value={resetCode}
                    onChangeText={setResetCode}
                    keyboardType="number-pad"
                    maxLength={8}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setResetStep('email')}>
                      <Text style={styles.cancelButtonText}>{t('back')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitButton} onPress={handleVerifyCode}>
                      <Text style={styles.submitButtonText}>{t('verify_code')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    gap: 12,
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastSuccess: {
    backgroundColor: '#10b981',
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  roleSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 15,
    marginBottom: 32,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeRoleButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeRoleButtonText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    gap: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  forgotPassword: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeModalBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 0,
    flex: 1,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputField: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
    gap: 10,
  },
  langToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeLang: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  activeLangText: {
    color: 'white',
  },
});

export default LoginScreen;
