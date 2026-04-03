import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Linking
} from 'react-native';
import { User, LogOut, Lock, HelpCircle, ChevronDown, Mail, Calendar, Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react-native';

const ProfileDropdown = ({ 
  user, t, onLogout, onChangePassword, onHelp,
  availableAcademicYears = [],
  selectedGlobalAcademicYear = null,
  changeAcademicYear
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getRealCurrentAcademicYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    if (month >= 8) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  };

  const incrementYear = (academicYear, direction) => {
    if (!academicYear) return null;
    const parts = academicYear.split('/');
    if (parts.length === 2) {
      const start = parseInt(parts[0]) + direction;
      const end = parseInt(parts[1]) + direction;
      return `${start}/${end}`;
    }
    return null;
  };

  const actualCurrentYear = getRealCurrentAcademicYear();
  const activeYearString = selectedGlobalAcademicYear || actualCurrentYear;

  // All years ordered oldest-first
  // availableAcademicYears comes sorted newest-first from context
  const allYears = [...(availableAcademicYears || [])].sort();

  // nextYear: the year after the current active one (only if it's in the list, or it IS the actual current year)
  const computedNextYear = incrementYear(activeYearString, 1);
  const nextYear = selectedGlobalAcademicYear !== null
    ? (allYears.includes(computedNextYear) || computedNextYear === actualCurrentYear ? computedNextYear : null)
    : null;

  // previousYear: the year before the active one (only if it's in our availableAcademicYears list)
  const computedPrevYear = incrementYear(activeYearString, -1);
  const previousYear = allYears.includes(computedPrevYear) ? computedPrevYear : null;

  const toggleDropdown = () => setIsVisible(!isVisible);
  const closeDropdown = () => setIsVisible(false);

  const handleAction = (callback) => {
    closeDropdown();
    if (callback) callback();
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const displayName = user?.name 
    ? user.name 
    : (user?.first_name && user?.last_name) 
      ? `${user.first_name} ${user.last_name}` 
      : user?.username || t('user');

  const userRole = user?.role === 'admin' ? t('admin') : user?.role === 'mesues' ? t('teacher') : t('student');
  const initials = getInitials(displayName);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.profileButton} 
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarInitialTextMini}>{initials}</Text>
        </View>
        <ChevronDown size={14} color="#64748b" style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownMenu}>
              <View style={styles.userInfoSection}>
                <View style={styles.largeAvatar}>
                  <Text style={styles.avatarInitialTextLarge}>{initials}</Text>
                </View>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userRole}>{userRole}</Text>
              </View>

              <View style={styles.divider} />

              {onChangePassword && (
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => handleAction(onChangePassword)}
                >
                  <Lock size={18} color="#64748b" />
                  <Text style={styles.menuItemText}>{t('change_password')}</Text>
                </TouchableOpacity>
              )}

              {changeAcademicYear && (
                <>
                  <View style={styles.divider} />
                  <Text style={{ paddingHorizontal: 28, paddingTop: 6, paddingBottom: 4, fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('academic_year_label') || "Vitet Shkollore"}
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.menuItem, { paddingVertical: 10 }]} 
                    onPress={() => handleAction(() => changeAcademicYear(null))}
                  >
                    <RotateCcw size={16} color={selectedGlobalAcademicYear === null ? "#2563eb" : "#94a3b8"} />
                    <Text style={[styles.menuItemText, { fontSize: 13, color: selectedGlobalAcademicYear === null ? "#2563eb" : "#475569" }]}>
                      Viti Aktual ({actualCurrentYear})
                    </Text>
                    {selectedGlobalAcademicYear === null && <Check size={14} color="#2563eb" style={{marginLeft: 'auto'}} />}
                  </TouchableOpacity>

                  {selectedGlobalAcademicYear !== null && nextYear !== actualCurrentYear && (
                    <TouchableOpacity 
                      style={[styles.menuItem, { paddingVertical: 10 }]} 
                      onPress={() => handleAction(() => changeAcademicYear(nextYear))}
                    >
                      <ChevronRight size={16} color="#94a3b8" />
                      <Text style={[styles.menuItemText, { fontSize: 13, color: "#475569" }]}>
                        Kalo në {nextYear} 
                      </Text>
                    </TouchableOpacity>
                  )}

                  {selectedGlobalAcademicYear !== null && (
                    <TouchableOpacity 
                      style={[styles.menuItem, { paddingVertical: 10, backgroundColor: '#f8fafc' }]} 
                      disabled={true}
                    >
                      <Calendar size={16} color="#2563eb" />
                      <Text style={[styles.menuItemText, { fontSize: 13, color: "#2563eb", fontWeight: '700' }]}>
                        Duke parë {selectedGlobalAcademicYear}
                      </Text>
                      <Check size={14} color="#2563eb" style={{marginLeft: 'auto'}} />
                    </TouchableOpacity>
                  )}

                  {previousYear && (
                    <TouchableOpacity 
                      style={[styles.menuItem, { paddingVertical: 10 }]} 
                      onPress={() => handleAction(() => changeAcademicYear(previousYear))}
                    >
                      <ChevronLeft size={16} color="#94a3b8" />
                      <Text style={[styles.menuItemText, { fontSize: 13, color: "#475569" }]}>
                        Kalo në vitin e kaluar {previousYear}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <View style={styles.divider} />

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => handleAction(onHelp)}
              >
                <HelpCircle size={18} color="#64748b" />
                <Text style={styles.menuItemText}>{t('help')}</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity 
                style={[styles.menuItem, styles.logoutItem]} 
                onPress={() => handleAction(onLogout)}
              >
                <LogOut size={18} color="#ef4444" />
                <Text style={[styles.menuItemText, styles.logoutText]}>{t('logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  avatarInitialTextMini: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 100 : 70, 
    paddingRight: 20,
  },
  dropdownMenu: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  userInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#dbeafe',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarInitialTextLarge: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563eb',
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
  },
  userRole: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
    marginHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    marginHorizontal: 8,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  logoutItem: {
    marginTop: 0,
  },
  logoutText: {
    color: '#ef4444',
  },
});

export default ProfileDropdown;
