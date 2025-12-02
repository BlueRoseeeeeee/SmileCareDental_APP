/**
 * @author: HoTram
 * Payment Failed Screen - Thanh toán thất bại
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const COLORS = {
  primary: '#2596be',
  secondary: '#2c5f4f',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
  error: '#ff4d4f',
  warning: '#faad14',
};

export default function PaymentFailedScreen() {
  const params = useLocalSearchParams();
  
  // Get data from params (passed from previous screen)
  const reservationId = params.reservationId;
  const serviceName = params.serviceName;
  const dentistName = params.dentistName;
  const errorMessage = params.error;

  const handleRetry = () => {
    router.replace('/booking/select-service');
  };

  const handleNavigateHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={80} color={COLORS.error} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Thanh toán thất bại</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Rất tiếc, giao dịch thanh toán của bạn không thành công. Vui lòng thử lại.
        </Text>

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="alert-circle" size={20} color={COLORS.error} />
              <Text style={styles.errorTitle}>Lỗi thanh toán</Text>
            </View>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>
        )}

        {/* Reservation Info */}
        {reservationId && (
          <View style={styles.reservationCard}>
            <Text style={styles.reservationTitle}>Thông tin đặt khám đã hủy</Text>
            
            <View style={styles.reservationItem}>
              <Text style={styles.reservationLabel}>Mã đặt khám:</Text>
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{reservationId}</Text>
              </View>
            </View>

            {serviceName && (
              <View style={styles.reservationItem}>
                <Text style={styles.reservationLabel}>Dịch vụ:</Text>
                <Text style={styles.reservationValue}>{serviceName}</Text>
              </View>
            )}

            {dentistName && (
              <View style={styles.reservationItem}>
                <Text style={styles.reservationLabel}>Bác sĩ:</Text>
                <Text style={styles.reservationValue}>{dentistName}</Text>
              </View>
            )}
          </View>
        )}

        {/* Possible Reasons */}
        <View style={styles.reasonsCard}>
          <View style={styles.reasonsHeader}>
            <Ionicons name="help-circle" size={20} color={COLORS.warning} />
            <Text style={styles.reasonsTitle}>Nguyên nhân có thể:</Text>
          </View>
          <View style={styles.reasonsList}>
            <View style={styles.reasonItem}>
              <Text style={styles.reasonBullet}>•</Text>
              <Text style={styles.reasonText}>Thông tin thẻ không chính xác</Text>
            </View>
            <View style={styles.reasonItem}>
              <Text style={styles.reasonBullet}>•</Text>
              <Text style={styles.reasonText}>Không đủ số dư trong tài khoản</Text>
            </View>
            <View style={styles.reasonItem}>
              <Text style={styles.reasonBullet}>•</Text>
              <Text style={styles.reasonText}>Thẻ đã hết hạn hoặc bị khóa</Text>
            </View>
            <View style={styles.reasonItem}>
              <Text style={styles.reasonBullet}>•</Text>
              <Text style={styles.reasonText}>Vượt quá thời gian thanh toán (3 phút)</Text>
            </View>
          </View>
        </View>

        {/* Support Info */}
        <View style={styles.supportCard}>
          <Text style={styles.supportLabel}>Cần hỗ trợ?</Text>
          <Text style={styles.supportText}>
            Liên hệ hotline: <Text style={styles.supportPhone}>1900000010</Text>
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Đặt lại lịch khám</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeButton} onPress={handleNavigateHome}>
            <Ionicons name="home" size={20} color={COLORS.text} />
            <Text style={styles.homeButtonText}>Về trang chủ</Text>
          </TouchableOpacity>
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
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#fff1f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffccc7',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  reservationCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reservationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reservationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  reservationLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 100,
  },
  reservationValue: {
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
  reasonsCard: {
    width: '100%',
    backgroundColor: '#fff7e6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffd591',
  },
  reasonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  reasonsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  reasonsList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reasonBullet: {
    fontSize: 14,
    color: COLORS.text,
    marginRight: 8,
  },
  reasonText: {
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
  supportLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  supportPhone: {
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  homeButton: {
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
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
