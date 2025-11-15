/**
 * @author: HoTram
 * Booking Select Time Screen - Chọn giờ khám
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
import slotService from '../../src/services/slotService';
import scheduleConfigService from '../../src/services/scheduleConfigService';
import { groupConsecutiveSlots, formatCurrency } from '../../src/utils/slotGrouping';
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
  orange: '#ff9800',
  purple: '#9c27b0',
};

// Format date to DD/MM/YYYY
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function BookingSelectTimeScreen() {
  const { user, isAuthenticated } = useAuth();
  const [service, setService] = useState(null);
  const [serviceAddOn, setServiceAddOn] = useState(null);
  const [dentist, setDentist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlotGroup, setSelectedSlotGroup] = useState(null);
  const [availableSlotGroups, setAvailableSlotGroups] = useState({
    morning: [],
    afternoon: [],
    evening: []
  });
  const [loading, setLoading] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState(null);

  // Helper function để lấy service duration
  const getServiceDuration = () => {
    if (serviceAddOn) {
      // Trường hợp 1: User đã chọn addon cụ thể
      return serviceAddOn.durationMinutes;
    } else if (service?.serviceAddOns && service.serviceAddOns.length > 0) {
      // Trường hợp 2: Không chọn addon → dùng duration dài NHẤT
      const longestAddon = service.serviceAddOns.reduce((longest, addon) => {
        return (addon.durationMinutes > longest.durationMinutes) ? addon : longest;
      }, service.serviceAddOns[0]);
      return longestAddon.durationMinutes;
    } else if (service?.durationMinutes) {
      // Trường hợp 3: Fallback về duration của service
      return service.durationMinutes;
    }
    return 15; // Mặc định
  };

  useEffect(() => {
    loadScheduleConfig();
  }, []);

  useEffect(() => {
    loadDataAndFetchSlots();
  }, []);

  const loadScheduleConfig = async () => {
    try {
      const response = await scheduleConfigService.getConfig();
      if (response.success && response.data) {
        setScheduleConfig(response.data);
        console.log('📋 Cấu hình schedule đã tải:', response.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy cấu hình schedule:', error);
      // Đặt giá trị mặc định nếu lấy thất bại
      setScheduleConfig({ depositAmount: 50000 });
    }
  };

  const loadDataAndFetchSlots = async () => {
    try {
      // Kiểm tra đã chọn đủ thông tin chưa
      const savedService = await AsyncStorage.getItem('booking_service');
      const savedServiceAddOn = await AsyncStorage.getItem('booking_serviceAddOn');
      const savedDentist = await AsyncStorage.getItem('booking_dentist');
      const savedDate = await AsyncStorage.getItem('booking_date');
      
      if (!savedService || !savedDentist || !savedDate) {
        Alert.alert('Lỗi', 'Vui lòng chọn dịch vụ, nha sỹ và ngày trước');
        router.replace('/booking/select-service');
        return;
      }

      const serviceData = JSON.parse(savedService);
      const serviceAddOnData = savedServiceAddOn ? JSON.parse(savedServiceAddOn) : null;
      const dentistData = JSON.parse(savedDentist);
      
      setService(serviceData);
      setServiceAddOn(serviceAddOnData);
      setDentist(dentistData);
      setSelectedDate(savedDate);

      console.log('📦 Service:', serviceData.name);
      console.log('📦 AddOn:', serviceAddOnData?.name || 'none');
      console.log('👨‍⚕️ Dentist:', dentistData.fullName);
      console.log('📅 Date:', savedDate);

      // Fetch available slots với thông tin service
      await fetchAvailableSlots(dentistData._id, savedDate, serviceData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đặt lịch');
    }
  };

  const fetchAvailableSlots = async (dentistId, date, serviceData) => {
    try {
      setLoading(true);
      
      console.log('🏥 Service ID:', serviceData?._id);
      console.log('🏥 Allowed RoomTypes:', serviceData?.allowedRoomTypes);
      
      // Gọi API lấy slot của nha sỹ trong ngày đã chọn
      const response = await slotService.getDentistSlotsFuture(dentistId, {
        date: date,
        shiftName: '', // Lấy tất cả ca
        serviceId: serviceData?._id // Truyền serviceId để filter theo roomType
      });
      
      console.log('⏰ Slots API response:', response);
      
      if (response.success && response.data) {
        // Load selectedServiceAddOn từ AsyncStorage
        const serviceAddOnData = await AsyncStorage.getItem('booking_serviceAddOn');
        const selectedServiceAddOn = serviceAddOnData ? JSON.parse(serviceAddOnData) : null;
        
        // Lấy duration: ưu tiên addon đã chọn, fallback về addon dài nhất, mặc định 15 phút
        let serviceDuration = 15;
        
        if (selectedServiceAddOn) {
          // Trường hợp 1: User đã chọn addon cụ thể
          serviceDuration = selectedServiceAddOn.durationMinutes;
          console.log('🎯 Dùng duration addon đã chọn:', serviceDuration, 'phút từ', selectedServiceAddOn.name);
        } else if (serviceData?.serviceAddOns && serviceData.serviceAddOns.length > 0) {
          // Trường hợp 2: Không chọn addon → dùng duration addon DÀI NHẤT
          const longestAddon = serviceData.serviceAddOns.reduce((longest, addon) => {
            return (addon.durationMinutes > longest.durationMinutes) ? addon : longest;
          }, serviceData.serviceAddOns[0]);
          
          serviceDuration = longestAddon.durationMinutes;
          console.log('🎯 Không chọn addon → Dùng duration addon DÀI NHẤT:', serviceDuration, 'phút từ', longestAddon.name);
        } else if (serviceData?.durationMinutes) {
          // Trường hợp 3: Fallback về duration của service
          serviceDuration = serviceData.durationMinutes;
          console.log('🎯 Dùng duration service:', serviceDuration, 'phút');
        }
        
        const slotDuration = 15; // Duration mặc định của slot (phải khớp với backend config)
        
        console.log('🔍 Service:', serviceData?.name, '| AddOn đã chọn:', selectedServiceAddOn?.name || 'không có', '| Duration cuối:', serviceDuration, 'phút');
        
        let allSlots = [];
        
        // Thu thập tất cả slot từ API response
        if (response.data.shifts) {
          allSlots = [
            ...(response.data.shifts['Ca Sáng'] || []),
            ...(response.data.shifts['Ca Chiều'] || []),
            ...(response.data.shifts['Ca Tối'] || [])
          ];
        } else if (response.data.slots) {
          allSlots = response.data.slots;
        }
        
        console.log('📊 Tổng slot trước khi filter:', allSlots.length);
        
        // Filter chỉ lấy slot active
        const activeSlots = allSlots.filter(slot => slot.isActive === true);
        console.log('✅ Slot active:', activeSlots.length, '/', allSlots.length);
        
        // Debug: Hiển thị phân bố trạng thái slot
        const statusCount = activeSlots.reduce((acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Phân bố trạng thái slot:', statusCount);
        
        // Gộp slot theo ca trước
        const slotsByShift = {
          morning: activeSlots.filter(s => s.shiftName === 'Ca Sáng'),
          afternoon: activeSlots.filter(s => s.shiftName === 'Ca Chiều'),
          evening: activeSlots.filter(s => s.shiftName === 'Ca Tối')
        };
        
        console.log('📦 Slot theo ca:', {
          morning: slotsByShift.morning.length,
          afternoon: slotsByShift.afternoon.length,
          evening: slotsByShift.evening.length
        });
        
        // Gộp các slot liên tục cho mỗi ca
        const groupedSlots = {
          morning: groupConsecutiveSlots(slotsByShift.morning, serviceDuration, slotDuration),
          afternoon: groupConsecutiveSlots(slotsByShift.afternoon, serviceDuration, slotDuration),
          evening: groupConsecutiveSlots(slotsByShift.evening, serviceDuration, slotDuration)
        };
        
        console.log('✨ Slot đã gộp:', groupedSlots);
        
        setAvailableSlotGroups(groupedSlots);
        
        const totalGroups = groupedSlots.morning.length + 
                           groupedSlots.afternoon.length + 
                           groupedSlots.evening.length;
        
        console.log('🎯 Tổng nhóm slot tạo:', totalGroups);
        
        if (totalGroups === 0) {
          Alert.alert('Thông báo', `Không có khung giờ phù hợp (cần ${Math.ceil(serviceDuration/slotDuration)} slot liên tục)`);
        }
      } else {
        console.error('Invalid API response format:', response);
        Alert.alert('Lỗi', 'Không thể tải danh sách giờ khám');
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      Alert.alert('Lỗi kết nối', error.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slotGroup) => {
    setSelectedSlotGroup(slotGroup);
  };

  const handleContinue = async () => {
    if (!selectedSlotGroup) {
      Alert.alert('Thông báo', 'Vui lòng chọn giờ khám');
      return;
    }
    
    // Lưu danh sách slot IDs và thông tin group
    await AsyncStorage.setItem('booking_slotIds', JSON.stringify(selectedSlotGroup.slotIds));
    await AsyncStorage.setItem('booking_slotGroup', JSON.stringify(selectedSlotGroup));
    
    // Kiểm tra user đã đăng nhập chưa
    if (!isAuthenticated) {
      // Chuyển đến màn login với return path
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để tiếp tục đặt lịch');
      router.push('/login');
    } else {
      router.push('/booking/create-appointment');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const renderShiftSlots = (shift, shiftName, slotGroups) => {
    const serviceDuration = getServiceDuration();
    const requiredSlots = Math.ceil(serviceDuration / 15);
    
    return (
      <View key={shift} style={styles.shiftSection}>
        <View style={styles.shiftHeader}>
          <Ionicons name="time-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.shiftName}>{shiftName}</Text>
        </View>
        
        {slotGroups.length === 0 ? (
          <View style={styles.emptyShift}>
            <Text style={styles.emptyShiftText}>Không có khung giờ nào trong ca này</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {slotGroups.map((slotGroup) => {
              const isSelected = selectedSlotGroup?.groupId === slotGroup.groupId;
              const slotCount = slotGroup.slots.length;
              const isAvailable = slotGroup.isAvailable !== false;
              
              return (
                <TouchableOpacity
                  key={slotGroup.groupId}
                  style={[
                    styles.slotCard,
                    isSelected && styles.slotCardSelected,
                    !isAvailable && styles.slotCardUnavailable,
                  ]}
                  onPress={() => isAvailable && handleSelectSlot(slotGroup)}
                  disabled={!isAvailable}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="time" 
                    size={18} 
                    color={isSelected ? COLORS.white : (!isAvailable ? COLORS.textLight : COLORS.secondary)} 
                  />
                  <Text style={[
                    styles.slotTime,
                    isSelected && styles.slotTimeSelected,
                    !isAvailable && styles.slotTimeUnavailable,
                  ]}>
                    {slotGroup.displayTime}
                  </Text>
                  
                  {!isAvailable && slotGroup.unavailableReason && (
                    <View style={[
                      styles.slotBadge,
                      slotGroup.unavailableReason.includes('đặt') && !slotGroup.unavailableReason.includes('giữ')
                        ? styles.slotBadgeBooked
                        : styles.slotBadgeLocked
                    ]}>
                      <Text style={styles.slotBadgeText}>
                        {slotGroup.unavailableReason.includes('đặt') && !slotGroup.unavailableReason.includes('giữ')
                          ? 'Đã đặt'
                          : 'Đang giữ'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const totalGroups = availableSlotGroups.morning.length + 
                      availableSlotGroups.afternoon.length + 
                      availableSlotGroups.evening.length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách giờ khám...</Text>
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
        <Text style={styles.headerTitle}>Chọn giờ khám</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Info */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.summaryTitle}>Thông tin chi tiết</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Dịch vụ:</Text>
            <Text style={styles.summaryValue}>{service?.name}</Text>
          </View>
          
          {serviceAddOn && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gói dịch vụ:</Text>
              <Text style={styles.summaryValue}>{serviceAddOn.name}</Text>
            </View>
          )}
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Thời gian dự kiến:</Text>
            <View style={styles.durationBadge}>
              <Ionicons name="hourglass-outline" size={14} color={COLORS.primary} />
              <Text style={styles.durationText}>{getServiceDuration()} phút</Text>
            </View>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Nha sỹ:</Text>
            <Text style={styles.summaryValue}>
              {dentist?.title || 'NS.'} {dentist?.fullName}
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Giới tính:</Text>
            <Text style={styles.summaryValue}>
              {dentist?.gender === 'male' ? 'Nam' : dentist?.gender === 'female' ? 'Nữ' : 'Khác'}
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ngày khám:</Text>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar" size={14} color={COLORS.success} />
              <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
            </View>
          </View>
          
          {selectedSlotGroup && scheduleConfig && (
            <>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Thời gian khám:</Text>
                <View style={styles.timeBadge}>
                  <Ionicons name="time" size={14} color={COLORS.orange} />
                  <Text style={styles.timeText}>{selectedSlotGroup.displayTime}</Text>
                </View>
              </View>
              <View style={styles.depositAlert}>
                <Ionicons name="cash-outline" size={20} color={COLORS.success} />
                <Text style={styles.depositText}>
                  Tiền cọc: {formatCurrency(selectedSlotGroup.slots.length * scheduleConfig.depositAmount)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Info Alert */}
        <View style={styles.infoAlert}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {totalGroups > 0 
              ? `Có ${totalGroups} khung giờ phù hợp trong ngày ${formatDisplayDate(selectedDate)}`
              : `Ngày ${formatDisplayDate(selectedDate)} - Chọn khung giờ phù hợp`
            }
          </Text>
        </View>

        {/* Time Slots by Shift */}
        {renderShiftSlots('morning', 'Ca sáng', availableSlotGroups.morning)}
        {renderShiftSlots('afternoon', 'Ca chiều', availableSlotGroups.afternoon)}
        {renderShiftSlots('evening', 'Ca tối', availableSlotGroups.evening)}

        {/* Selected Slot Alert */}
        {selectedSlotGroup && scheduleConfig && (
          <View style={styles.selectedAlert}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <View style={styles.selectedAlertContent}>
              <Text style={styles.selectedAlertTitle}>
                Đã chọn: {selectedSlotGroup.displayTime}
              </Text>
              <Text style={styles.selectedAlertSubtitle}>
                Tiền cọc: {formatCurrency(selectedSlotGroup.slots.length * scheduleConfig.depositAmount)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
        
        {selectedSlotGroup && scheduleConfig && (
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              Tiếp tục ({formatCurrency(selectedSlotGroup.slots.length * scheduleConfig.depositAmount)})
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
  summaryCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 120,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
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
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ffe6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7e6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.orange,
  },
  depositAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ffe6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  depositText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ff',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  shiftSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  emptyShift: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  emptyShiftText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotCard: {
    width: '31.5%',
    minHeight: 80,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCardSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.secondary,
  },
  slotCardUnavailable: {
    opacity: 0.6,
    backgroundColor: '#fafafa',
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 6,
    textAlign: 'center',
  },
  slotTimeSelected: {
    color: COLORS.white,
  },
  slotTimeUnavailable: {
    color: COLORS.textLight,
  },
  slotBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotBadgeBooked: {
    backgroundColor: COLORS.error,
  },
  slotBadgeLocked: {
    backgroundColor: COLORS.warning,
  },
  slotBadgeText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  selectedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ffe6',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    gap: 8,
  },
  selectedAlertContent: {
    flex: 1,
  },
  selectedAlertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  selectedAlertSubtitle: {
    fontSize: 13,
    color: COLORS.success,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    paddingBottom: 40,
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
  continueButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
