/**
 * Home Screen - Trang chủ sau khi đăng nhập
 * @author: HoTram
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TodayAppointments from '../../src/components/TodayAppointments';
import { useAuth } from '../../src/contexts/AuthContext';

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
  const [showMenu, setShowMenu] = React.useState(false);

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
            <Text style={styles.infoTitle}>SmileCare Dental Clinic</Text>
          </View>
          <Text style={styles.infoSubtitle}>Chăm sóc nụ cười của bạn</Text>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={COLORS.textLight} />
            <Text style={styles.infoText}>Hotline: 1900-xxxx</Text>
          </View>
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
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textLight,
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
