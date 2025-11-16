/**
 * @author: HoTram
 * Payment Result Screen - Kết quả thanh toán
 */

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

const COLORS = {
  primary: '#2596be',
  secondary: '#2c5f4f',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
  success: '#52c41a',
  error: '#ff4d4f',
  warning: '#faad14',
};

export default function PaymentResultScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  // Get params from URL (VNPay callback)
  const payment = params.payment;
  const status = params.status || payment; // Support both params
  const orderId = params.orderId;
  const code = params.code;
  const message = params.message;

  useEffect(() => {
    // Simulate checking payment status
    setTimeout(() => {
      setLoading(false);
    }, 1000);

    // Clear booking data from AsyncStorage after payment
    clearBookingData();
  }, []);

  const clearBookingData = async () => {
    try {
      await AsyncStorage.multiRemove([
        'booking_service',
        'booking_serviceAddOn',
        'booking_dentist',
        'booking_date',
        'booking_slotIds',
        'booking_slotGroup',
        'booking_reservation',
        'booking_examRecordId',
      ]);
      console.log('✅ Cleared booking data from AsyncStorage');
    } catch (error) {
      console.error('Error clearing booking data:', error);
    }
  };

  const handleNavigateToAppointments = () => {
    router.replace('/(tabs)');
  };

  const handleNavigateHome = () => {
    router.replace('/(tabs)');
  };

  const handleRetry = () => {
    router.replace('/booking/select-service');
  };

  const getResultConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          iconColor: COLORS.success,
          title: 'Thanh toán thành công!',
          subtitle: 'Cảm ơn bạn đã thanh toán. Lịch khám đã được xác nhận.',
          statusText: 'Đã thanh toán',
          statusColor: COLORS.success,
          buttons: [
            {
              label: 'Xem lịch khám',
              icon: 'calendar',
              onPress: handleNavigateToAppointments,
              primary: true,
            },
            {
              label: 'Về trang chủ',
              icon: 'home',
              onPress: handleNavigateHome,
              primary: false,
            },
          ],
        };

      case 'failed':
        return {
          icon: 'close-circle',
          iconColor: COLORS.error,
          title: 'Thanh toán thất bại',
          subtitle: `Đã có lỗi xảy ra trong quá trình thanh toán. ${message || 'Vui lòng thử lại.'}`,
          statusText: 'Thanh toán không thành công',
          statusColor: COLORS.error,
          buttons: [
            {
              label: 'Thử lại',
              icon: 'refresh',
              onPress: handleRetry,
              primary: true,
              danger: true,
            },
            {
              label: 'Về trang chủ',
              icon: 'home',
              onPress: handleNavigateHome,
              primary: false,
            },
          ],
        };

      case 'error':
        return {
          icon: 'warning',
          iconColor: COLORS.warning,
          title: 'Có lỗi xảy ra',
          subtitle: message || 'Không thể xác nhận thanh toán. Vui lòng liên hệ với chúng tôi.',
          statusText: 'Lỗi xác nhận',
          statusColor: COLORS.warning,
          buttons: [
            {
              label: 'Về trang chủ',
              icon: 'home',
              onPress: handleNavigateHome,
              primary: true,
            },
          ],
        };

      default:
        return {
          icon: 'information-circle',
          iconColor: COLORS.primary,
          title: 'Đang xử lý',
          subtitle: 'Vui lòng đợi trong giây lát...',
          buttons: [],
        };
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang xác nhận thanh toán...</Text>
        </View>
      </View>
    );
  }

  const config = getResultConfig();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Result Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={80} color={config.iconColor} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{config.title}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{config.subtitle}</Text>

        {/* Transaction Details */}
        {orderId && (
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mã giao dịch:</Text>
              <Text style={styles.detailValue}>{orderId}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Thời gian:</Text>
              <Text style={styles.detailValue}>
                {new Date().toLocaleString('vi-VN')}
              </Text>
            </View>

            {config.statusText && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trạng thái:</Text>
                <Text style={[styles.statusText, { color: config.statusColor }]}>
                  {config.statusText}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Failed Payment Info */}
        {status === 'failed' && (
          <View style={styles.failedInfoCard}>
            <View style={styles.failedInfoHeader}>
              <Ionicons name="information-circle" size={20} color={COLORS.warning} />
              <Text style={styles.failedInfoTitle}>Nguyên nhân có thể:</Text>
            </View>
            <View style={styles.failedInfoList}>
              <View style={styles.failedInfoItem}>
                <Text style={styles.failedInfoBullet}>•</Text>
                <Text style={styles.failedInfoText}>Thông tin thẻ không chính xác</Text>
              </View>
              <View style={styles.failedInfoItem}>
                <Text style={styles.failedInfoBullet}>•</Text>
                <Text style={styles.failedInfoText}>Không đủ số dư trong tài khoản</Text>
              </View>
              <View style={styles.failedInfoItem}>
                <Text style={styles.failedInfoBullet}>•</Text>
                <Text style={styles.failedInfoText}>Thẻ đã hết hạn hoặc bị khóa</Text>
              </View>
              <View style={styles.failedInfoItem}>
                <Text style={styles.failedInfoBullet}>•</Text>
                <Text style={styles.failedInfoText}>
                  Vượt quá thời gian thanh toán (15 phút)
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Support Info */}
        <View style={styles.supportCard}>
          <Text style={styles.supportText}>
            Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ hotline:{' '}
            <Text style={styles.supportPhone}>1900000010</Text>
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {config.buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.button,
                button.primary && styles.buttonPrimary,
                button.danger && styles.buttonDanger,
              ]}
              onPress={button.onPress}
            >
              <Ionicons
                name={button.icon}
                size={20}
                color={button.primary || button.danger ? COLORS.white : COLORS.text}
              />
              <Text
                style={[
                  styles.buttonText,
                  button.primary && styles.buttonTextPrimary,
                  button.danger && styles.buttonTextDanger,
                ]}
              >
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight,
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  failedInfoCard: {
    width: '100%',
    backgroundColor: '#fff7e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffd591',
  },
  failedInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  failedInfoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  failedInfoList: {
    gap: 8,
  },
  failedInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  failedInfoBullet: {
    fontSize: 14,
    color: COLORS.text,
    marginRight: 8,
  },
  failedInfoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  supportCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  supportText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  supportPhone: {
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  buttonDanger: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonTextPrimary: {
    color: COLORS.white,
  },
  buttonTextDanger: {
    color: COLORS.white,
  },
});
