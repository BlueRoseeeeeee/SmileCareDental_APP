/**
 * @author: HoTram
 * Payment Selection Screen - Chọn phương thức thanh toán
 */

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import paymentService from '../../src/services/paymentService';
import scheduleConfigService from '../../src/services/scheduleConfigService';
import { formatCurrency } from '../../src/utils/slotGrouping';

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
  error: '#ea4335',
  vnpay: '#0066CC',
  stripe: '#635bff',
};

// Format date to DD/MM/YYYY
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  if (dayjs.isDayjs(dateStr)) {
    return dateStr.format('DD/MM/YYYY');
  }
  const parsed = dayjs(dateStr);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : '';
};

export default function PaymentSelectionScreen() {
  const { user } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('vnpay'); // Default to VNPay
  const [loading, setLoading] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({ depositAmount: 50000 });

  useEffect(() => {
    loadReservationData();
    loadScheduleConfig();
  }, []);

  const loadScheduleConfig = async () => {
    try {
      const response = await scheduleConfigService.getConfig();
      if (response.success && response.data) {
        setScheduleConfig(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy cấu hình schedule:', error);
    }
  };

  const loadReservationData = async () => {
    try {
      // Lấy reservation data từ AsyncStorage (được lưu từ create-appointment)
      const reservationStr = await AsyncStorage.getItem('booking_reservation');
      
      if (!reservationStr) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin đặt khám. Vui lòng thử lại.');
        router.replace('/booking/select-service');
        return;
      }

      const reservationData = JSON.parse(reservationStr);
      setReservation(reservationData);
      
      console.log('📦 Loaded reservation:', reservationData);
    } catch (error) {
      console.error('Error loading reservation:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đặt khám');
      router.replace('/booking/select-service');
    }
  };

  const handlePayment = async () => {
    if (!reservation) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin đặt khám');
      return;
    }

    console.log('🔵 [Payment Selection] handlePayment called');
    console.log('🔵 [Payment Selection] Payment method:', paymentMethod);
    console.log('🔵 [Payment Selection] Reservation data:', reservation);

    // Get orderId and amount with fallbacks
    const orderId = reservation.orderId || reservation.reservationId || reservation._id;
    const amount = reservation.amount || reservation.depositAmount || 0;

    if (!orderId || !amount) {
      Alert.alert('Lỗi', 'Thiếu thông tin thanh toán. Vui lòng thử lại.');
      return;
    }

    try {
      setLoading(true);

      if (paymentMethod === 'vnpay') {

        const requestBody = {
          orderId: orderId,
          amount: amount,
          orderInfo: `Thanh toan dat lich kham nha khoa - ${orderId}`,
          locale: 'vn'
        };

        const response = await paymentService.createVNPayUrl(requestBody);

        if (response.success && response.data?.paymentUrl) {
          
          // Lưu paymentUrl và payment method để dùng trong WebView screen
          await AsyncStorage.setItem('payment_url', response.data.paymentUrl);
          await AsyncStorage.setItem('payment_orderId', orderId);
          await AsyncStorage.setItem('payment_method', 'vnpay');
          
          // Navigate đến WebView screen
          router.push('/payment/webview');
        } else {
          throw new Error(response.message || 'Không thể tạo URL thanh toán VNPay');
        }
      } else if (paymentMethod === 'stripe') {

        const requestBody = {
          orderId: orderId,
          amount: amount,
          orderInfo: `Thanh toan dat lich kham nha khoa - ${orderId}`,
        };

        const response = await paymentService.createStripePaymentLink(requestBody);

        if (response.success && response.data?.paymentUrl) {
          
          // Lưu paymentUrl và payment method để dùng trong WebView screen
          await AsyncStorage.setItem('payment_url', response.data.paymentUrl);
          await AsyncStorage.setItem('payment_orderId', orderId);
          await AsyncStorage.setItem('payment_method', 'stripe');
          
          // Navigate đến WebView screen
          router.push('/payment/webview');
        } else {
          throw new Error(response.message || 'Không thể tạo link thanh toán Stripe');
        }
      } else {
        Alert.alert('Thông báo', 'Phương thức thanh toán này đang được phát triển');
      }
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || error.message || 'Có lỗi xảy ra khi xử lý thanh toán'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!reservation) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn phương thức thanh toán</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Page Title */}
        <View style={styles.titleContainer}>
          <Ionicons name="card" size={32} color={COLORS.secondary} />
          <Text style={styles.pageTitle}>Chọn phương thức thanh toán</Text>
          <Text style={styles.pageSubtitle}>
            Vui lòng chọn phương thức thanh toán để hoàn tất đặt khám
          </Text>
        </View>

        {/* Reservation Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Thông tin đặt khám</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã đặt khám:</Text>
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>
                  {reservation.reservationId || reservation.orderId || 'Đang cập nhật'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dịch vụ:</Text>
              <Text style={styles.infoValue}>{reservation.serviceName || 'Đang cập nhật'}</Text>
            </View>

            {reservation.serviceAddOnName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gói dịch vụ:</Text>
                <Text style={styles.infoValue}>{reservation.serviceAddOnName}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nha sỹ:</Text>
              <Text style={styles.infoValue}>{reservation.dentistName || 'Đang cập nhật'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày khám:</Text>
              <Text style={styles.infoValue}>
                {formatDisplayDate(reservation.appointmentDate)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Giờ khám:</Text>
              <Text style={styles.infoValue}>
                {reservation.startTime && reservation.endTime
                  ? `${reservation.startTime} - ${reservation.endTime}`
                  : 'Sẽ được thông báo'}
              </Text>
            </View>

            {reservation.roomName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phòng:</Text>
                <Text style={styles.infoValue}>
                  {reservation.roomName}
                </Text>
              </View>
            )}

            {/* hiển thị tên buồng nếu có buồng */}
            {reservation.subroomName&&(
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Buồng:</Text>
                <Text style={styles.infoValue}>
                  {reservation.subroomName}
                </Text>
              </View>
            )
            }

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng tiền:</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(reservation.amount || reservation.depositAmount || 0)} VNĐ
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet" size={20} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          </View>

          {/* VNPay Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'vnpay' && styles.paymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('vnpay')}
            activeOpacity={0.7}
          >
            <View style={styles.radioButton}>
              {paymentMethod === 'vnpay' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            
            <View style={styles.paymentOptionContent}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="card" size={32} color={COLORS.vnpay} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>VNPay</Text>
                <Text style={styles.paymentDescription}>
                  ATM / Internet Banking / Ví điện tử / Thẻ quốc tế
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Stripe Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'stripe' && styles.paymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('stripe')}
            activeOpacity={0.7}
          >
            <View style={styles.radioButton}>
              {paymentMethod === 'stripe' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            
            <View style={styles.paymentOptionContent}>
              <View style={styles.paymentIconContainer}>
                <Ionicons name="card-outline" size={32} color={COLORS.stripe} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>Stripe</Text>
                <Text style={styles.paymentDescription}>
                  Visa / MasterCard / American Express / Thẻ quốc tế
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Payment Notice */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.noticeTitle}>Lưu ý quan trọng:</Text>
          </View>
          <View style={styles.noticeContent}>
            <View style={styles.noticeItem}>
              <Text style={styles.noticeBullet}>•</Text>
              <Text style={styles.noticeText}>
                Sau khi thanh toán thành công, lịch khám của bạn sẽ được xác nhận
              </Text>
            </View>
            <View style={styles.noticeItem}>
              <Text style={styles.noticeBullet}>•</Text>
              <Text style={styles.noticeText}>
                Vui lòng hoàn tất thanh toán trong vòng{' '}
                <Text style={styles.noticeHighlight}>3 phút</Text>
              </Text>
            </View>
            <View style={styles.noticeItem}>
              <Text style={styles.noticeBullet}>•</Text>
              <Text style={styles.noticeText}>
                Sau 3 phút, đặt khám sẽ tự động hủy và bạn cần đặt lại
              </Text>
            </View>
            <View style={styles.noticeItem}>
              <Text style={styles.noticeBullet}>•</Text>
              <Text style={styles.noticeText}>
                Thông tin thanh toán được mã hóa và bảo mật tuyệt đối
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.paymentButton}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="card" size={20} color={COLORS.white} />
              <Text style={styles.paymentButtonText}>Tiến hành thanh toán</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
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
  titleContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  infoCard: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 120,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  codeBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  paymentOptionSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: '#f0f9f6',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
  },
  paymentOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIconContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  noticeCard: {
    backgroundColor: '#f0ffe6',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b7eb8f',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  noticeContent: {
    gap: 8,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeBullet: {
    fontSize: 14,
    color: COLORS.text,
    marginRight: 8,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  noticeHighlight: {
    fontWeight: 'bold',
    color: COLORS.error,
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
