import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, Dimensions, Modal, ScrollView, useWindowDimensions, Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { School, Mail, Lock, LogIn, X, Eye, EyeOff, XCircle, CheckCircle, ChevronDown, Globe } from 'lucide-react-native';

const IS_WEB = Platform.OS === 'web';

// ─── Language Dropdown (web uses native select, mobile uses modal) ────────────
function LanguageDropdown({ language, changeLanguage, t, isDesktop }) {
  const options = [
    { value: 'sq', label: 'Shqip' },
    { value: 'sr', label: 'Srpski' },
  ];

  return (
    <View style={isDesktop ? dd.wrapper : dd.mobileWrapper}>
      <View style={dd.row}>
        <Globe size={18} color="#64748b" />
        <View style={dd.selectWrap}>
          {Platform.OS === 'web' ? (
            <select
              value={language}
              onChange={e => changeLanguage(e.target.value)}
              style={{
                width: '100%', border: 'none', background: 'transparent',
                fontSize: 14, color: '#1e293b', outline: 'none', cursor: 'pointer',
                padding: '8px 28px 8px 10px', appearance: 'none', fontFamily: 'inherit',
              }}
            >
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <TouchableOpacity 
              style={{ width: '100%', padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              onPress={() => {
                // In native, we might want a modal or just toggle for simplicity here
                const nextIndex = (options.findIndex(o => o.value === language) + 1) % options.length;
                changeLanguage(options[nextIndex].value);
              }}
            >
              <Text style={{ fontSize: 14, color: '#1e293b' }}>
                {options.find(o => o.value === language)?.label}
              </Text>
            </TouchableOpacity>
          )}
          <View style={dd.chevron} pointerEvents="none">
            <ChevronDown size={14} color="#64748b" />
          </View>
        </View>
      </View>
    </View>
  );
}

const dd = StyleSheet.create({
  wrapper: { 
    position: 'absolute',
    top: 24,
    right: 10,
    zIndex: 10,
  },
  mobileWrapper: {
    position: 'absolute',
    top: 24,
    right: 10,
    zIndex: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectWrap: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: 'white',
    overflow: 'hidden', position: 'relative', width: 120,
  },
  chevron: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', pointerEvents: 'none' },
});

// ─── Left Decorative Panel (web only) ─────────────────────────────────────────
function LeftPanel({ t }) {
  const words = [
    { text: 'DIGJITAL', size: 28, x: '8%', y: '12%', color: '#93c5fd', rotate: '-5deg' },
    { text: 'ARSIM', size: 42, x: '5%', y: '22%', color: '#ffffff', rotate: '0deg' },
    { text: 'NXËNËS', size: 20, x: '50%', y: '10%', color: '#bfdbfe', rotate: '3deg' },
    { text: 'MËSUES', size: 24, x: '55%', y: '18%', color: '#93c5fd', rotate: '-3deg' },
    { text: 'REGJISTRI', size: 18, x: '12%', y: '36%', color: '#dbeafe', rotate: '2deg' },
    { text: 'NOTA', size: 32, x: '40%', y: '28%', color: '#ffffff', rotate: '-4deg' },
    { text: 'KLASA', size: 22, x: '6%', y: '46%', color: '#93c5fd', rotate: '1deg' },
    { text: 'SHKOLLA', size: 36, x: '30%', y: '40%', color: '#bfdbfe', rotate: '-2deg' },
    { text: 'ORARI', size: 18, x: '62%', y: '38%', color: '#dbeafe', rotate: '4deg' },
    { text: 'MUNGESA', size: 20, x: '10%', y: '56%', color: '#93c5fd', rotate: '-3deg' },
    { text: 'LËNDË', size: 26, x: '42%', y: '54%', color: '#ffffff', rotate: '0deg' },
    { text: 'AGJENDA', size: 18, x: '65%', y: '50%', color: '#bfdbfe', rotate: '2deg' },
    { text: 'PROVIM', size: 22, x: '8%', y: '66%', color: '#dbeafe', rotate: '-2deg' },
    { text: 'DETYRË', size: 18, x: '38%', y: '64%', color: '#93c5fd', rotate: '3deg' },
    { text: 'PORTAL', size: 30, x: '52%', y: '62%', color: '#ffffff', rotate: '-1deg' },
    { text: 'NJOFTIM', size: 16, x: '12%', y: '76%', color: '#bfdbfe', rotate: '4deg' },
    { text: 'KALENDAR', size: 20, x: '34%', y: '74%', color: '#93c5fd', rotate: '-3deg' },
    { text: 'VLERËSIM', size: 24, x: '55%', y: '74%', color: '#dbeafe', rotate: '2deg' },
  ];

  return (
    <View style={lp.panel}>
      {/* Background gradient circles */}
      <View style={[lp.blob, { width: 300, height: 300, top: -80, left: -80, opacity: 0.15 }]} />
      <View style={[lp.blob, { width: 200, height: 200, bottom: 40, right: -60, opacity: 0.1 }]} />

      {/* Word cloud */}
      {IS_WEB && words.map((w, i) => (
        <Text key={i} style={{
          position: 'absolute', left: w.x, top: w.y,
          fontSize: w.size, color: w.color, fontWeight: '800',
          transform: [{ rotate: w.rotate }], opacity: 0.9,
          fontFamily: 'system-ui, sans-serif',
          userSelect: 'none',
        }}>
          {w.text}
        </Text>
      ))}

      {/* Bottom branding */}
      <View style={lp.bottomBrand}>
        <Text style={lp.bigTitle}>Ditari Elektronik</Text>
        <Text style={lp.tagline}>Platforma digjitale arsimore</Text>
      </View>
    </View>
  );
}

const lp = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: '#1e40af',
    overflow: 'hidden',
    position: 'relative',
    minHeight: '100vh',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'white',
  },
  bottomBrand: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bigTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -1,
    fontFamily: 'system-ui, sans-serif',
  },
  tagline: {
    fontSize: 15,
    color: '#bfdbfe',
    marginTop: 6,
    fontFamily: 'system-ui, sans-serif',
  },
});

// ─── Main Login Screen ─────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && SCREEN_WIDTH > 768;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { resetPassword, updatePassword, isPasswordRecovery, verifyResetOtp } = useAuth();
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalError, setModalError] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('error');

  const { t, language, changeLanguage } = useLanguage();

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSubmit = () => {
    onLogin({ username, password });
  };

  const handleResetRequest = async () => {
    setModalError(null);
    if (!resetEmail) { setModalError(t('email_placeholder')); return; }
    try {
      await resetPassword(resetEmail);
      setResetStep('code');
    } catch (err) {
      setModalError(err.message === 'Unable to validate email address: invalid format'
        ? t('email_invalid_format') : err.message);
    }
  };

  const handleVerifyCode = async () => {
    setModalError(null);
    if (!resetCode) { setModalError(t('code_placeholder')); return; }
    try {
      await verifyResetOtp(resetEmail, resetCode);
      setIsResetModalVisible(false);
      setResetStep('email');
      setResetCode('');
      setResetEmail('');
    } catch (err) {
      setModalError(
        err.message === 'Token has expired or is invalid' ? t('token_invalid')
          : err.message === 'Unable to validate email address: invalid format' ? t('email_invalid_format')
            : err.message
      );
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) { showToast(t('error'), 'error'); return; }
    try {
      await updatePassword(newPassword);
      showToast(t('success'), 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── Form panel (right side on web, full screen on mobile) ──


  return (
    <SafeAreaView style={s.root}>
      {/* Toast */}
      {toastMessage && (
        <View style={[s.toast, toastType === 'success' ? s.toastOk : s.toastErr]}>
          {toastType === 'success'
            ? <CheckCircle color="white" size={18} />
            : <XCircle color="white" size={18} />}
          <Text style={s.toastText}>{toastMessage}</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {isDesktop ? (
          /* ── Desktop: two-column layout ── */
          <View style={s.webLayout}>
            <LeftPanel t={t} />
            <View style={s.rightPanel}>
              <LanguageDropdown language={language} changeLanguage={changeLanguage} t={t} isDesktop={isDesktop} />
              <ScrollView
                contentContainerStyle={isDesktop ? s.formPanelWeb : s.formPanelMobile}
                showsVerticalScrollIndicator={false}
              >
                <View style={isDesktop ? { flex: 1, justifyContent: 'center' } : null}>
                  {/* Logo Image */}
                  <View style={isDesktop ? s.logoContainer : s.logoContainerMobile}>
                    <Image 
                      source={require('../../assets/logo.png')} 
                      style={isDesktop ? s.logoImage : s.logoImageMobile}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Divider */}
                  <View style={s.divider} />

                  {/* Email + Password inline */}
                  <View style={isDesktop ? s.inlineRow : null}>
                    {/* Email */}
                    <View style={[s.fieldWrap, isDesktop && { flex: 1, marginRight: 16 }]}>
                      <Text style={s.fieldLabel}>{t('email')}</Text>
                      <View style={s.inputRow}>
                        <Mail size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                        <TextInput
                          style={s.input}
                          placeholder={t('email_placeholder')}
                          placeholderTextColor="#94a3b8"
                          value={username}
                          onChangeText={setUsername}
                          autoCapitalize="none"
                          keyboardType="email-address"
                        />
                      </View>
                    </View>

                    {/* Password */}
                    <View style={[s.fieldWrap, isDesktop && { flex: 1 }]}>
                      <Text style={s.fieldLabel}>{t('password')}</Text>
                      <View style={s.inputRow}>
                        <Lock size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                        <TextInput
                          style={s.input}
                          placeholder="••••••••"
                          placeholderTextColor="#94a3b8"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                          {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Bottom row: forgot + login */}
                  <View style={isDesktop ? s.actionRow : s.actionRowMobile}>
                    <TouchableOpacity onPress={() => { setModalError(null); setIsResetModalVisible(true); }}>
                      <Text style={s.forgotText}>{t('forgot_password')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.loginBtn} onPress={handleSubmit}>
                      <Text style={s.loginBtnText}>{t('login_button')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Copyright */}
                {isDesktop && (
                  <Text style={s.copyright}>© 2026 {t('welcome_title')}. {t('all_rights_reserved')}</Text>
                )}
              </ScrollView>
            </View>
          </View>
        ) : (
          /* ── Mobile: single column ── */
          <View style={s.mobileLayout}>
            <LanguageDropdown language={language} changeLanguage={changeLanguage} t={t} isDesktop={isDesktop} />
            <ScrollView
              contentContainerStyle={isDesktop ? s.formPanelWeb : s.formPanelMobile}
              showsVerticalScrollIndicator={false}
            >
              <View style={isDesktop ? { flex: 1, justifyContent: 'center' } : null}>
                {/* Logo Image */}
                <View style={isDesktop ? s.logoContainer : s.logoContainerMobile}>
                  <Image 
                    source={require('../../assets/logo.png')} 
                    style={isDesktop ? s.logoImage : s.logoImageMobile}
                    resizeMode="contain"
                  />
                </View>

                {/* Divider */}
                <View style={s.divider} />

                {/* Email + Password inline */}
                <View style={isDesktop ? s.inlineRow : null}>
                  {/* Email */}
                  <View style={[s.fieldWrap, isDesktop && { flex: 1, marginRight: 16 }]}>
                    <Text style={s.fieldLabel}>{t('email')}</Text>
                    <View style={s.inputRow}>
                      <Mail size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={s.input}
                        placeholder={t('email_placeholder')}
                        placeholderTextColor="#94a3b8"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View style={[s.fieldWrap, isDesktop && { flex: 1 }]}>
                    <Text style={s.fieldLabel}>{t('password')}</Text>
                    <View style={s.inputRow}>
                      <Lock size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                      <TextInput
                        style={s.input}
                        placeholder="••••••••"
                        placeholderTextColor="#94a3b8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                        {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Bottom row: forgot + login */}
                <View style={isDesktop ? s.actionRow : s.actionRowMobile}>
                  <TouchableOpacity onPress={() => { setModalError(null); setIsResetModalVisible(true); }}>
                    <Text style={s.forgotText}>{t('forgot_password')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.loginBtn} onPress={handleSubmit}>
                    <Text style={s.loginBtnText}>{t('login_button')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Copyright */}
              {isDesktop && (
                <Text style={s.copyright}>© 2026 {t('welcome_title')}. {t('all_rights_reserved')}</Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Password Recovery Overlay */}
        {isPasswordRecovery && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#eff6ff', zIndex: 100 }]}>
            <ScrollView contentContainerStyle={isDesktop ? s.formPanelWeb : s.formPanelMobile}>
              <View style={s.brandRow}>
                <View style={[s.logoBox, { backgroundColor: '#7c3aed' }]}>
                  <Lock color="white" size={28} />
                </View>
                <View style={s.brandText}>
                  <Text style={s.brandTitle}>{t('change_password_title')}</Text>
                  <Text style={s.brandSub}>{t('change_password_subtitle')}</Text>
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{t('new_password')}</Text>
                <View style={s.inputRow}>
                  <Lock size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput style={s.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showNewPassword} />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 4 }}>
                    {showNewPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{t('confirm_password')}</Text>
                <View style={s.inputRow}>
                  <Lock size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput style={s.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showNewPassword} />
                </View>
              </View>
              <TouchableOpacity style={[s.loginBtn, { alignSelf: 'stretch', justifyContent: 'center' }]} onPress={handleUpdatePassword}>
                <Text style={s.loginBtnText}>{t('change_password_title')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Reset Password Modal */}
        <Modal visible={isResetModalVisible} animationType="slide" transparent>
          <View style={s.overlay}>
            <View style={s.modal}>
              <View style={s.modalHead}>
                <Text style={s.modalTitle}>
                  {resetStep === 'email' ? t('reset_password_title') : t('enter_code_title')}
                </Text>
                <TouchableOpacity onPress={() => setIsResetModalVisible(false)} style={s.closeBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              {modalError && (
                <View style={s.errorBox}>
                  <XCircle size={14} color="#ef4444" />
                  <Text style={s.errorText}>{modalError}</Text>
                </View>
              )}
              <Text style={s.modalDesc}>
                {resetStep === 'email' ? t('reset_password_desc') : t('enter_code_desc')}
              </Text>
              <TextInput
                style={s.modalInput}
                placeholder={resetStep === 'email' ? t('email_placeholder') : t('code_placeholder')}
                value={resetStep === 'email' ? resetEmail : resetCode}
                onChangeText={resetStep === 'email' ? setResetEmail : setResetCode}
                autoCapitalize="none"
                keyboardType={resetStep === 'email' ? 'email-address' : 'number-pad'}
                maxLength={resetStep === 'code' ? 8 : undefined}
              />
              <View style={s.modalBtns}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => {
                  if (resetStep === 'code') { setModalError(null); setResetStep('email'); }
                  else setIsResetModalVisible(false);
                }}>
                  <Text style={s.cancelBtnText}>{resetStep === 'code' ? t('back') : t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.submitBtn} onPress={resetStep === 'email' ? handleResetRequest : handleVerifyCode}>
                  <Text style={s.submitBtnText}>{resetStep === 'email' ? t('send_email') : t('verify_code')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  // Web two-column
  webLayout: { flex: 1, flexDirection: 'row', minHeight: '100vh' },
  rightPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    justifyContent: 'center',
    position: 'relative',
  },
  formPanelWeb: {
    padding: 60,
    minHeight: '100vh',
    width: '100%',
    flexGrow: 1,
  },

  // Mobile
  mobileLayout: { flex: 1, backgroundColor: 'white' },
  formPanelMobile: {
    flexGrow: 1,
    padding: 28,
    justifyContent: 'center',
  },

  // Logo
  logoContainer: { alignItems: 'flex-start', marginBottom: 24, marginLeft: -15 },
  logoContainerMobile: { alignItems: 'center', marginBottom: 12 },
  logoImage: { width: 400, height: 160 },
  logoImageMobile: { width: 280, height: 100 },
  brandSub: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'left' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 24 },

  // Inline row for email+password
  inlineRow: { flexDirection: 'row', alignItems: 'flex-start' },

  // Role switcher (unused - kept for reference)
  roleSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  roleBtnActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  roleBtnTextActive: { color: '#2563eb', fontWeight: '700' },

  // Fields
  fieldWrap: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 0.8, marginBottom: 7, textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 4,
    minHeight: 52,
  },
  input: {
    flex: 1, paddingVertical: 14, fontSize: 16,
    color: '#1e293b', outlineStyle: 'none',
  },

  // Action row
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 8, marginBottom: 24,
  },
  actionRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 24,
  },
  forgotText: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563eb', paddingHorizontal: 48, paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  copyright: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 'auto', paddingTop: 20 },

  // Toast
  toast: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 16,
    left: 16, right: 16, flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, zIndex: 9999, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 10,
  },
  toastErr: { backgroundColor: '#ef4444' },
  toastOk: { backgroundColor: '#10b981' },
  toastText: { color: 'white', fontSize: 14, fontWeight: '600', flex: 1 },

  // Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modal: {
    backgroundColor: 'white', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 480,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1 },
  closeBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 },
  modalDesc: { fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 20 },
  modalInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 13, fontSize: 14, color: '#1e293b', marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', padding: 12, borderRadius: 10, marginBottom: 14,
  },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600', flex: 1 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderRadius: 10, backgroundColor: '#f1f5f9',
  },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 14 },
  submitBtn: {
    flex: 2, paddingVertical: 13, alignItems: 'center',
    borderRadius: 10, backgroundColor: '#2563eb',
  },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});

export default LoginScreen;
