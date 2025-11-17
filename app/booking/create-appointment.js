/**
 * @author: HoTram
 * Booking Create Appointment Screen - Tạo phiếu khám
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import appointmentService from '../../src/services/appointmentService';
import scheduleConfigService from '../../src/services/scheduleConfigService';
import { getEffectivePriceForDate, getPriceScheduleInfo, formatCurrency } from '../../src/utils/priceScheduleUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(isBetween);
dayjs.extend(timezone);
dayjs.extend(utc);

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
  orange: '#ff9800',
  purple: '#9c27b0',
  discount: '#ff4d4f',
};

// Format date to DD/MM/YYYY
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  if (dayjs.isDayjs(dateStr)) {
    return dateStr.format('DD/MM/YYYY');
  }
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function CreateAppointmentScreen() {
  const { user, isAuthenticated } = useAuth();
  const [service, setService] = useState(null);
  const [serviceAddOn, setServiceAddOn] = useState(null);
  const [dentist, setDentist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlotGroup, setSelectedSlotGroup] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({ depositAmount: 50000 });

  useEffect(() => {
    // Kiểm tra đã đăng nhập chưa
    if (!isAuthenticated) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để tiếp tục đặt lịch');
      router.replace('/login');
      return;
    }

    loadScheduleConfig();
    loadBookingData();
  }, [isAuthenticated]);

  const loadScheduleConfig = async () => {
    try {
      const response = await scheduleConfigService.getConfig();
      if (response.success && response.data) {
        setScheduleConfig(response.data);
        console.log('📋 Cấu hình schedule đã tải:', response.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy cấu hình schedule:', error);
      // Giữ giá trị mặc định nếu lỗi
      setScheduleConfig({ depositAmount: 50000 });
    }
  };

  const loadBookingData = async () => {
    try {
      // Kiểm tra đã chọn đủ thông tin chưa
      const savedService = await AsyncStorage.getItem('booking_service');
      const savedServiceAddOn = await AsyncStorage.getItem('booking_serviceAddOn');
      const savedDentist = await AsyncStorage.getItem('booking_dentist');
      const savedDate = await AsyncStorage.getItem('booking_date');
      const savedSlotGroup = await AsyncStorage.getItem('booking_slotGroup');
      
      if (!savedService || !savedDentist || !savedDate || !savedSlotGroup) {
        Alert.alert('Lỗi', 'Vui lòng chọn đầy đủ thông tin đặt lịch');
        router.replace('/booking/select-service');
        return;
      }
      
      const serviceData = JSON.parse(savedService);
      const serviceAddOnData = savedServiceAddOn ? JSON.parse(savedServiceAddOn) : null;
      const dentistData = JSON.parse(savedDentist);
      const slotGroupData = JSON.parse(savedSlotGroup);
      
      setService(serviceData);
      setServiceAddOn(serviceAddOnData);
      setDentist(dentistData);
      setSelectedDate(dayjs(savedDate));
      setSelectedSlotGroup(slotGroupData);

      console.log('📦 Loaded booking data:', {
        service: serviceData.name,
        serviceAddOn: serviceAddOnData?.name || 'none',
        dentist: dentistData.fullName,
        date: savedDate,
        slotGroup: slotGroupData.displayTime
      });
    } catch (error) {
      console.error('Error loading booking data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đặt lịch');
      router.replace('/booking/select-service');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Lấy exam recordId nếu có
      const examRecordId = await AsyncStorage.getItem('booking_examRecordId');
      
      // Tạo reservation data
      const reservationData = {
        patientId: user._id,
        patientInfo: {
          fullName: user.fullName,
          phone: user.phone,
          email: user.email || null,
          dateOfBirth: user.dateOfBirth.format
        },
        serviceId: service._id,
        serviceAddOnId: serviceAddOn?._id || null,
        dentistId: dentist._id,
        slotIds: selectedSlotGroup.slotIds,
        date: selectedDate.format('YYYY-MM-DD'),
        notes: notes || '',
        examRecordId: examRecordId || null
      };
      
      console.log('📝 Creating reservation with data:', reservationData);
      if (examRecordId) {
        console.log('🩺 Exam record ID for hasBeenUsed update:', examRecordId);
      }
      
      const response = await appointmentService.reserveAppointment(reservationData);
      
      console.log('✅ Reservation API response:', response);
      
      if (response.success && response.data) {
        // Lưu reservation data vào AsyncStorage để dùng ở màn payment
        await AsyncStorage.setItem('booking_reservation', JSON.stringify(response.data));
        
        Alert.alert(
          'Đặt chỗ thành công!',
          'Vui lòng thanh toán trong 15 phút.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Kiểm tra nếu backend trả về paymentUrl
                if (response.data.paymentUrl) {
                  console.log('🔄 Redirecting to payment URL:', response.data.paymentUrl);
                  Linking.openURL(response.data.paymentUrl).catch(err => {
                    console.error('Failed to open URL:', err);
                    Alert.alert('Lỗi', 'Không thể mở trang thanh toán');
                  });
                } else {
                  // Navigate đến payment selection
                  console.log('📍 Navigating to payment selection');
                  router.push('/payment/select');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Lỗi', response.message || 'Có lỗi xảy ra khi đặt chỗ');
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Có lỗi xảy ra khi đặt chỗ'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!service || !dentist || !selectedDate || !selectedSlotGroup) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </View>
    );
  }

  // Lấy item để tính giá (ưu tiên addon)
  const itemForPrice = serviceAddOn || service;
  const priceInfo = getPriceScheduleInfo(itemForPrice, selectedDate);
  const { basePrice, activeSchedule } = priceInfo;
  const effectivePrice = getEffectivePriceForDate(itemForPrice, selectedDate);
  const depositAmount = selectedSlotGroup.slots.length * scheduleConfig.depositAmount;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo phiếu khám</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info Alert */}
        <View style={styles.infoAlert}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Vui lòng kiểm tra lại thông tin trước khi xác nhận
          </Text>
        </View>

        {/* Appointment Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Thông tin đặt khám</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dịch vụ:</Text>
              <View style={styles.infoValueContainer}>
                <Text style={styles.infoValue}>{service.name}</Text>
                {serviceAddOn && (
                  <Text style={styles.infoValueAddOn}>({serviceAddOn.name})</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Giá dịch vụ:</Text>
              <View style={styles.infoValueContainer}>
                {activeSchedule ? (
                  <View>
                    <View style={styles.priceRow}>
                      <Text style={styles.basePriceStrike}>
                        {formatCurrency(basePrice)} VNĐ
                      </Text>
                      <Text style={styles.discountPrice}>
                        {formatCurrency(activeSchedule.price)} VNĐ
                      </Text>
                      {serviceAddOn && (
                        <Text style={styles.priceUnit}> / {serviceAddOn.unit}</Text>
                      )}
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>Giảm giá</Text>
                      </View>
                    </View>
                    <Text style={styles.scheduleDate}>
                      ({formatDisplayDate(activeSchedule.startDate)} - {formatDisplayDate(activeSchedule.endDate)})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.priceRow}>
                    <Text style={styles.regularPrice}>
                      {formatCurrency(basePrice)} VNĐ
                    </Text>
                    {serviceAddOn && (
                      <Text style={styles.priceUnit}> / {serviceAddOn.unit}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {serviceAddOn && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Thời gian dự kiến:</Text>
                <View style={styles.durationBadge}>
                  <Ionicons name="hourglass-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.durationText}>~{serviceAddOn.durationMinutes} phút</Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nha sỹ:</Text>
              <Text style={styles.infoValue}>
                {dentist.title || 'NS.'} {dentist.fullName}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Giới tính:</Text>
              <Text style={styles.infoValue}>
                {dentist.gender === 'male' ? 'Nam' : dentist.gender === 'female' ? 'Nữ' : 'Khác'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày khám:</Text>
              <Text style={styles.infoValue}>{formatDisplayDate(selectedDate)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời gian:</Text>
              <Text style={styles.infoValue}>{selectedSlotGroup.displayTime}</Text>
            </View>
          </View>
        </View>

        {/* Patient Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Thông tin bệnh nhân</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Họ và tên:</Text>
              <Text style={styles.infoValue}>{user?.fullName || 'Chưa cập nhật'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số điện thoại:</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Chưa cập nhật'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày sinh:</Text>
              <Text style={styles.infoValue}>
                {user?.dateOfBirth ? dayjs(user.dateOfBirth).format('DD/MM/YYYY') : 'Chưa cập nhật'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="create" size={20} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Ghi chú (Tùy chọn)</Text>
          </View>
          
          <TextInput
            style={styles.notesInput}
            placeholder="Nhập ghi chú nếu có (triệu chứng, yêu cầu đặc biệt...)"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
            maxLength={500}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{notes.length}/500</Text>
        </View>

        {/* Total Amount */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <View style={styles.totalLabelContainer}>
              <Ionicons name="cash-outline" size={13} color={COLORS.success} />
              <Text style={styles.totalLabel}>Tiền cọc (phải thanh toán): </Text>
            </View>
            <Text style={styles.totalAmount}>{formatCurrency(depositAmount)} VNĐ</Text>
          </View>
          <Text style={styles.totalNote}>
            (Giá dịch vụ: {formatCurrency(effectivePrice)} VNĐ - thanh toán sau khi khám)
          </Text>
        </View>

        {/* Payment Notice */}
        <View style={styles.paymentNotice}>
          <Ionicons name="card" size={20} color={COLORS.primary} />
          <View style={styles.paymentNoticeContent}>
            <Text style={styles.paymentNoticeTitle}>Thanh toán trực tuyến</Text>
            <Text style={styles.paymentNoticeText}>
              Sau khi xác nhận, bạn sẽ được chuyển đến trang chọn phương thức thanh toán (Visa/MasterCard). 
              Vui lòng hoàn tất thanh toán trong 15 phút.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Xác nhận & Thanh toán</Text>
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
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
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
  infoValueContainer: {
    flex: 1,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoValueAddOn: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  basePriceStrike: {
    fontSize: 14,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.discount,
  },
  regularPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  priceUnit: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  discountBadge: {
    backgroundColor: COLORS.discount,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  scheduleDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  notesInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  totalCard: {
    backgroundColor: '#f0ffe6',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.discount,
  },
  totalNote: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  paymentNotice: {
    flexDirection: 'row',
    backgroundColor: '#e6f4ff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  paymentNoticeContent: {
    flex: 1,
  },
  paymentNoticeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  paymentNoticeText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 30,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
