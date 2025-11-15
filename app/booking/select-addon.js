/**
 * @author: HoTram
 * Booking Select AddOn Screen - Chọn gói dịch vụ
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import recordService from '../../src/services/recordService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  gold: '#faad14',
};

// Format price
const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

// Format date range
const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
  const end = new Date(endDate).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${start} - ${end}`;
};

// Get price schedule info
const getPriceScheduleInfo = (priceSchedules = [], basePrice) => {
  if (!priceSchedules || priceSchedules.length === 0) {
    return {
      effectivePrice: basePrice,
      hasActiveSchedule: false,
      hasUpcomingSchedules: false,
      activeSchedule: null,
      upcomingSchedules: [],
    };
  }

  const now = new Date();
  const activeSchedules = priceSchedules
    .filter(s => s.isActive && new Date(s.startDate) <= now && new Date(s.endDate) >= now)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  const upcomingSchedules = priceSchedules
    .filter(s => s.isActive && new Date(s.startDate) > now)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const activeSchedule = activeSchedules[0] || null;
  const effectivePrice = activeSchedule ? activeSchedule.price : basePrice;

  return {
    effectivePrice,
    hasActiveSchedule: !!activeSchedule,
    hasUpcomingSchedules: upcomingSchedules.length > 0,
    activeSchedule,
    upcomingSchedules,
  };
};

// Price Display Component
const PriceDisplay = ({ addon }) => {
  const priceInfo = getPriceScheduleInfo(addon.priceSchedules, addon.price);
  const { activeSchedule, upcomingSchedules, hasActiveSchedule, hasUpcomingSchedules } = priceInfo;

  return (
    <View style={styles.priceContainer}>
      {/* Active schedule with discounted price */}
      {hasActiveSchedule && (
        <View style={styles.priceActiveSchedule}>
          <View style={styles.priceRow}>
            <Ionicons name="pricetag" size={16} color={COLORS.error} />
            <Text style={styles.priceOld}>{formatPrice(addon.price)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceNew}>{formatPrice(activeSchedule.price)}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>Đang giảm giá</Text>
            </View>
          </View>
          <View style={styles.priceRow}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.priceDateRange}>
              {formatDateRange(activeSchedule.startDate, activeSchedule.endDate)}
            </Text>
          </View>
          {activeSchedule.reason && (
            <Text style={styles.priceReason}>{activeSchedule.reason}</Text>
          )}
        </View>
      )}

      {/* Normal price (no active schedule) */}
      {!hasActiveSchedule && (
        <View style={styles.priceRow}>
          <Ionicons name="cash-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.priceNormal}>{formatPrice(addon.price)}</Text>
          <Text style={styles.priceUnit}>/ {addon.unit}</Text>
        </View>
      )}

      {/* Upcoming schedules */}
      {hasUpcomingSchedules && (
        <View style={styles.upcomingContainer}>
          <View style={styles.upcomingHeader}>
            <Ionicons name="information-circle" size={14} color={COLORS.primary} />
            <Text style={styles.upcomingTitle}>Lịch giá sắp tới:</Text>
          </View>
          {upcomingSchedules.slice(0, 2).map((schedule, idx) => (
            <View key={schedule._id || idx} style={styles.upcomingItem}>
              <Text style={styles.upcomingPrice}>{formatPrice(schedule.price)}</Text>
              <Text style={styles.upcomingDate}>
                ({formatDateRange(schedule.startDate, schedule.endDate)})
              </Text>
              {schedule.reason && (
                <Text style={styles.upcomingReason}>{schedule.reason}</Text>
              )}
            </View>
          ))}
          {upcomingSchedules.length > 2 && (
            <Text style={styles.upcomingMore}>
              +{upcomingSchedules.length - 2} lịch giá khác...
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default function BookingSelectAddOnScreen() {
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [treatmentIndications, setTreatmentIndications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canSelectAddOn, setCanSelectAddOn] = useState(false);

  useEffect(() => {
    loadServiceAndCheckIndications();
  }, []);

  const loadServiceAndCheckIndications = async () => {
    try {
      // Load service từ AsyncStorage
      const savedService = await AsyncStorage.getItem('booking_service');
      
      if (!savedService) {
        Alert.alert('Lỗi', 'Vui lòng chọn dịch vụ trước');
        router.replace('/booking/select-service');
        return;
      }

      const serviceData = JSON.parse(savedService);
      setService(serviceData);

      // Xóa addon cũ
      await AsyncStorage.removeItem('booking_serviceAddOn');
      await AsyncStorage.removeItem('booking_recordId');

      // Nếu service không có addons, skip sang màn chọn bác sĩ
      if (!serviceData.serviceAddOns || serviceData.serviceAddOns.length === 0) {
        Alert.alert('Thông báo', 'Dịch vụ này không có gói phụ, chuyển sang bước tiếp theo');
        setTimeout(() => {
          router.replace('/booking/select-dentist');
        }, 1000);
        return;
      }

      // Check if service requires exam first and user has indications
      if (serviceData.requireExamFirst && user) {
        setLoading(true);
        try {
          const response = await recordService.getTreatmentIndications(user._id, serviceData._id);
          const indications = response.data || [];
          
          setTreatmentIndications(indications);
          
          // If has indications with serviceAddOnId, can select that specific addon
          if (indications.length > 0 && indications[0].serviceAddOnId) {
            setCanSelectAddOn(true);
          } else {
            setCanSelectAddOn(false);
          }
        } catch (error) {
          console.error('Error fetching treatment indications:', error);
          setCanSelectAddOn(false);
        } finally {
          setLoading(false);
        }
      } else if (serviceData.requireExamFirst && !user) {
        // User chưa login nhưng service yêu cầu khám trước
        setCanSelectAddOn(false);
      } else {
        // Service không yêu cầu khám trước → chỉ cho XEM, không cho chọn
        setCanSelectAddOn(false);
      }
    } catch (error) {
      console.error('Error loading service:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin dịch vụ');
    }
  };

  const handleSelectAddOn = async (addon) => {
    if (!canSelectAddOn) {
      Alert.alert('Thông báo', 'Bạn cần khám trước để được chỉ định gói điều trị phù hợp');
      return;
    }
    
    // Only allow selecting the indicated addon if there's an indication
    if (treatmentIndications.length > 0) {
      const isIndicatedAddon = treatmentIndications.some(ind => ind.serviceAddOnId === addon._id);
      
      if (!isIndicatedAddon) {
        Alert.alert('Thông báo', 'Bạn chỉ có thể chọn gói dịch vụ đã được chỉ định');
        return;
      }
    }
    
    // Save selected addon
    await AsyncStorage.setItem('booking_serviceAddOn', JSON.stringify(addon));
    await AsyncStorage.setItem('booking_serviceAddOn_userSelected', 'true');
    
    // Save recordId if this addon is from a treatment indication
    const indication = treatmentIndications.find(ind => ind.serviceAddOnId === addon._id);
    if (indication) {
      await AsyncStorage.setItem('booking_recordId', indication.recordId);
    } else {
      await AsyncStorage.removeItem('booking_recordId');
    }
    
    Alert.alert('Thành công', `Đã chọn gói: ${addon.name}`);
    router.push('/booking/select-dentist');
  };

  const handleBack = () => {
    router.back();
  };

  const handleSkipAddon = async () => {
    // Nếu có chỉ định addon cụ thể → BẮT BUỘC phải chọn
    if (treatmentIndications.length > 0 && treatmentIndications.some(ind => ind.serviceAddOnId)) {
      Alert.alert('Thông báo', 'Bạn phải chọn một trong các gói dịch vụ đã được chỉ định để tiếp tục');
      return;
    }
    
    if (service.requireExamFirst && treatmentIndications.length === 0) {
      Alert.alert('Thông báo', 'Dịch vụ này yêu cầu khám trước. Vui lòng đặt lịch khám tổng quát trước.');
      return;
    }
    
    // If service has addons, save the longest one for slot grouping
    if (service.serviceAddOns && service.serviceAddOns.length > 0) {
      const longestAddon = service.serviceAddOns.reduce((longest, addon) => {
        return (addon.durationMinutes || 0) > (longest.durationMinutes || 0) ? addon : longest;
      }, service.serviceAddOns[0]);
      
      await AsyncStorage.setItem('booking_serviceAddOn', JSON.stringify(longestAddon));
      await AsyncStorage.setItem('booking_serviceAddOn_userSelected', 'false');
    } else {
      await AsyncStorage.removeItem('booking_serviceAddOn');
      await AsyncStorage.removeItem('booking_serviceAddOn_userSelected');
    }
    
    await AsyncStorage.removeItem('booking_recordId');
    
    router.push('/booking/select-dentist');
  };

  if (!service) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang kiểm tra chỉ định điều trị...</Text>
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
        <Text style={styles.headerTitle}>Chọn gói dịch vụ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Service Name */}
        <View style={styles.serviceNameContainer}>
          <Text style={styles.serviceNameLabel}>Dịch vụ:</Text>
          <Text style={styles.serviceName}>{service.name}</Text>
        </View>

        {/* Important Notifications */}
        {service.requireExamFirst && (
          <View style={styles.alertWarning}>
            <Ionicons name="warning" size={20} color={COLORS.warning} />
            <Text style={styles.alertText}>Dịch vụ này yêu cầu khám trước khi điều trị</Text>
          </View>
        )}
        
        {treatmentIndications.length > 0 && treatmentIndications.some(ind => ind.serviceAddOnId) && (
          <View style={styles.alertSuccess}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.alertText}>
              {treatmentIndications.length === 1
                ? `Bạn đã được chỉ định gói: ${treatmentIndications[0].serviceAddOnName}`
                : `Bạn đã được chỉ định ${treatmentIndications.length} gói: ${treatmentIndications.map(ind => ind.serviceAddOnName).join(', ')}`
              }
            </Text>
          </View>
        )}
        
        {service.requireExamFirst && treatmentIndications.length === 0 && (
          <View style={styles.alertInfo}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.alertText}>
              Bạn cần khám trước để được nha sỹ chỉ định gói điều trị phù hợp.
            </Text>
          </View>
        )}

        {/* Guide Text */}
        {service.serviceAddOns && service.serviceAddOns.length > 0 && (
          <Text style={styles.guideText}>
            {canSelectAddOn
              ? (treatmentIndications.length > 0 && treatmentIndications[0].serviceAddOnId
                  ? 'Vui lòng xác nhận gói điều trị đã được chỉ định'
                  : 'Chọn gói dịch vụ phù hợp với nhu cầu của bạn')
              : 'Các gói dịch vụ chỉ để tham khảo. Bạn cần khám trước để được chỉ định gói phù hợp.'
            }
          </Text>
        )}

        {/* AddOns List */}
        {service.serviceAddOns && service.serviceAddOns.filter(addon => addon.isActive).map((addon) => {
          const isIndicated = treatmentIndications.some(ind => ind.serviceAddOnId === addon._id);
          const isDisabled = !canSelectAddOn || (treatmentIndications.length > 0 && !isIndicated);
          
          return (
            <TouchableOpacity
              key={addon._id}
              style={[
                styles.addonCard,
                isIndicated && styles.addonCardIndicated,
                isDisabled && styles.addonCardDisabled,
              ]}
              onPress={() => !isDisabled && handleSelectAddOn(addon)}
              disabled={isDisabled}
            >
              <View style={styles.addonHeader}>
                <Ionicons name="cube" size={20} color={COLORS.secondary} />
                <Text style={styles.addonName}>{addon.name}</Text>
                {isIndicated && (
                  <View style={styles.indicatedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    <Text style={styles.indicatedText}>Đã chỉ định</Text>
                  </View>
                )}
              </View>

              <PriceDisplay addon={addon} />

              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                <Text style={styles.durationText}>Thời gian: ~{addon.durationMinutes} phút</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        
        {/* Chỉ hiển thị button "Bỏ qua/Tiếp theo" nếu KHÔNG có chỉ định addon cụ thể */}
        {!(treatmentIndications.length > 0 && treatmentIndications.some(ind => ind.serviceAddOnId)) && (
          <TouchableOpacity
            style={[styles.nextButton, canSelectAddOn && styles.nextButtonSecondary]}
            onPress={handleSkipAddon}
          >
            <Text style={styles.nextButtonText}>
              {canSelectAddOn ? 'Bỏ qua' : 'Tiếp theo'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
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
  serviceNameContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  serviceNameLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  alertWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ffe6',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ff',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  guideText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  addonCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  addonCardIndicated: {
    borderColor: COLORS.success,
    backgroundColor: '#f0ffe6',
  },
  addonCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  addonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  addonName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  indicatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  indicatedText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  priceContainer: {
    marginBottom: 12,
  },
  priceActiveSchedule: {
    backgroundColor: '#fff1f0',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  priceOld: {
    fontSize: 14,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  discountBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  priceDateRange: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  priceReason: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
  priceNormal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  priceUnit: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  upcomingContainer: {
    backgroundColor: '#e6f4ff',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  upcomingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  upcomingItem: {
    marginBottom: 4,
  },
  upcomingPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  upcomingDate: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  upcomingReason: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  upcomingMore: {
    fontSize: 11,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  nextButtonSecondary: {
    backgroundColor: COLORS.textLight,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
