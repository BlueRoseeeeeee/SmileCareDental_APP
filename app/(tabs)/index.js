/**
 * Home Screen - Trang chủ sau khi đăng nhập
 * @author: HoTram
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import TodayAppointments from '../../src/components/TodayAppointments';
import { useAuth } from '../../src/contexts/AuthContext';
import scheduleConfigService from '../../src/services/scheduleConfigService';

const COLORS = {
  primary: '#2596be',
  secondary: '#2c5f4f',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
  success: '#34a853',
  warning: '#fbbc04',
};

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [workingHours, setWorkingHours] = useState([]);
  const [workingDaysText, setWorkingDaysText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkingInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWorkingInfo = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchWorkingHours(), fetchWorkingDays()]);
    } catch (error) {
      console.error('Error fetching working info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkingHours = async () => {
    try {
      const response = await scheduleConfigService.getConfig();
      if (response.success && response.data) {
        const config = response.data;
        const activeShifts = [];

        if (config.morningShift?.isActive) {
          activeShifts.push({
            name: config.morningShift.name,
            time: `${config.morningShift.startTime} - ${config.morningShift.endTime}`
          });
        }
        if (config.afternoonShift?.isActive) {
          activeShifts.push({
            name: config.afternoonShift.name,
            time: `${config.afternoonShift.startTime} - ${config.afternoonShift.endTime}`
          });
        }
        if (config.eveningShift?.isActive) {
          activeShifts.push({
            name: config.eveningShift.name,
            time: `${config.eveningShift.startTime} - ${config.eveningShift.endTime}`
          });
        }

        setWorkingHours(activeShifts);
      }
    } catch (error) {
      console.error('Error fetching working hours:', error);
      setWorkingHours([]);
    }
  };

  const fetchWorkingDays = async () => {
    try {
      const response = await scheduleConfigService.getHolidays();
      if (response.success && response.data) {
        const holidays = response.data.holidays || [];
        
        const workingDays = holidays
          .filter(h => h.isRecurring === true && h.isActive === false)
          .map(h => h.dayOfWeek)
          .sort((a, b) => a - b);

        const dayNames = {
          1: 'Chủ Nhật',
          2: 'Thứ Hai', 
          3: 'Thứ Ba',
          4: 'Thứ Tư',
          5: 'Thứ Năm',
          6: 'Thứ Sáu',
          7: 'Thứ Bảy'
        };

        if (workingDays.length === 0) {
          setWorkingDaysText('Phòng khám đang trong trạng thái đóng cửa...');
        } else if (workingDays.length === 7) {
          setWorkingDaysText('Làm việc tất cả các ngày trong tuần');
        } else {
          const workingDayNames = workingDays.map(d => dayNames[d]);
          setWorkingDaysText(`Làm việc vào các ngày: ${workingDayNames.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('Error fetching working days:', error);
      setWorkingDaysText('');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Xác nhận đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (_error) {
              Alert.alert('Lỗi', 'Đăng xuất thất bại!');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 1,
      title: 'Đặt lịch khám',
      icon: 'calendar-outline',
      color: '#4da6ff',
      bgColor: '#e6f4ff',
      route: '/booking/select-service',
    },
    {
      id: 2,
      title: 'Lịch của tôi',
      icon: 'list-outline',
      color: '#52c41a',
      bgColor: '#f0ffe6',
      route: '/appointments',
    },
    {
      id: 3,
      title: 'Hồ sơ',
      icon: 'document-text-outline',
      color: '#ff4d4f',
      bgColor: '#fff1f0',
      route: '/records',
    },
    {
      id: 4,
      title: 'Hóa đơn',
      icon: 'card-outline',
      color: '#faad14',
      bgColor: '#fffbe6',
      route: '/invoices',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{user?.fullName || 'Người dùng'}!</Text>
          </View>
          <View>
            <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
            
            {/* Dropdown Menu */}
            {showMenu && (
              <View style={styles.menuDropdown}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    router.push('/profile');
                  }}
                >
                  <Ionicons name="person-outline" size={20} color={COLORS.text} />
                  <Text style={styles.menuItemText}>Thông tin cá nhân</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    router.push('/change-password');
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.text} />
                  <Text style={styles.menuItemText}>Đổi mật khẩu</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={() => {
                    setShowMenu(false);
                    handleLogout();
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Đăng xuất</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

      </View>

      {/* Today Appointments Component */}
      <TodayAppointments />

      {/* Main Content */}
      <View style={styles.content}>
        {/* Chức năng Section */}
        <Text style={styles.sectionTitle}>Chức năng</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() => router.push(item.route)}
            >
              <View style={[styles.menuIconWrapper, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Thông tin Section */}
        <Text style={styles.sectionTitle}>Thông tin</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            <Text style={styles.infoTitle}>SmileCare Dental</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Nguyễn Văn Bảo, Gò Vấp, thành phố Hồ Chí Minh</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={18} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>smilecare.dental@gmail.com</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={18} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoTextBold}>HOTLINE: 190000010</Text>
          </View>

          <View style={styles.infoDivider} />

          <Text style={styles.infoSectionTitle}>LỊCH LÀM VIỆC</Text>

          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
          ) : (
            <>
              {workingHours.length > 0 ? (
                workingHours.map((shift, index) => (
                  <View key={index} style={styles.infoRow}>
                    <Ionicons name="time" size={18} color={COLORS.primary} style={styles.infoIcon} />
                    <Text style={styles.infoText}>{shift.name}: {shift.time}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={18} color={COLORS.primary} style={styles.infoIcon} />
                  <Text style={styles.infoText}>Phòng khám đang trong trạng thái đóng cửa...</Text>
                </View>
              )}

              {workingDaysText && (
                <View style={[styles.infoRow, styles.infoRowMultiline]}>
                  <Ionicons name="calendar" size={18} color={COLORS.primary} style={styles.infoIcon} />
                  <Text style={[styles.infoText, styles.infoTextFlex]}>{workingDaysText}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e6f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  content: {
    padding: 20,
    marginTop: -15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    marginTop: 8,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  menuCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#313b79',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRowMultiline: {
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 0,
    padding:0 5 0 0,
  },
  infoTextFlex: {
    flex: 1,
    flexWrap: 'wrap',
  },
  infoTextBold: {
    fontSize: 14,
    color: 'red',
    fontWeight: '600',
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  infoSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 12,
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 200,
    paddingVertical: 8,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  menuItemTextDanger: {
    color: COLORS.error,
  },
});
