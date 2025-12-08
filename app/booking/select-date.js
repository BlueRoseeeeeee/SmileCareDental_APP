/**
 * @author: HoTram
 * Booking Select Date Screen - Chọn ngày khám
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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Calendar, CalendarList, Agenda, ExpandableCalendar, LocaleConfig } from 'react-native-calendars';
import { useAuth } from '../../src/contexts/AuthContext';
import slotService from '../../src/services/slotService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========== CẤU HÌNH LỊCH SANG TIẾNG VIỆT ==========
// Bước 1: Import LocaleConfig từ 'react-native-calendars' (đã import ở dòng 17)
// Bước 2: Tạo cấu hình ngôn ngữ tiếng Việt
LocaleConfig.locales['vi'] = {
  // Tên đầy đủ của các tháng (hiển thị ở header của lịch)
  monthNames: [
    'Tháng 1',    // January
    'Tháng 2',    // February
    'Tháng 3',    // March
    'Tháng 4',    // April
    'Tháng 5',    // May
    'Tháng 6',    // June
    'Tháng 7',    // July
    'Tháng 8',    // August
    'Tháng 9',    // September
    'Tháng 10',   // October
    'Tháng 11',   // November
    'Tháng 12'    // December
  ],
  // Tên viết tắt của các tháng (nếu cần hiển thị dạng ngắn)
  monthNamesShort: ['Th.1', 'Th.2', 'Th.3', 'Th.4', 'Th.5', 'Th.6', 'Th.7', 'Th.8', 'Th.9', 'Th.10', 'Th.11', 'Th.12'],
  // Tên đầy đủ của các ngày trong tuần
  dayNames: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
  // Tên viết tắt của các ngày trong tuần (hiển thị trên header của lịch)
  dayNamesShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  // Text hiển thị cho "Today"
  today: 'Hôm nay'
};
// Bước 3: Đặt ngôn ngữ mặc định là tiếng Việt
LocaleConfig.defaultLocale = 'vi';
// ========== KẾT THÚC CẤU HÌNH ==========

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
};

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Format date to DD/MM/YYYY
const formatDisplayDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function BookingSelectDateScreen() {
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [serviceAddOn, setServiceAddOn] = useState(null);
  const [dentist, setDentist] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [workingDates, setWorkingDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadDataAndFetchWorkingDates();
  }, []);

  const loadDataAndFetchWorkingDates = async () => {
    try {
      // Load service, addon, dentist từ AsyncStorage
      const savedService = await AsyncStorage.getItem('booking_service');
      const savedServiceAddOn = await AsyncStorage.getItem('booking_serviceAddOn');
      const savedDentist = await AsyncStorage.getItem('booking_dentist');
      
      if (!savedService || !savedDentist) {
        Alert.alert('Lỗi', 'Vui lòng chọn dịch vụ và nha sỹ trước');
        router.replace('/booking/select-service');
        return;
      }

      const serviceData = JSON.parse(savedService);
      const serviceAddOnData = savedServiceAddOn ? JSON.parse(savedServiceAddOn) : null;
      const dentistData = JSON.parse(savedDentist);
      
      setService(serviceData);
      setServiceAddOn(serviceAddOnData);
      setDentist(dentistData);

      console.log('📦 Service:', serviceData.name);
      console.log('📦 AddOn:', serviceAddOnData?.name || 'none');
      console.log('👨‍⚕️ Dentist:', dentistData.fullName);

      // Calculate service duration (prioritize addon)
      const serviceDuration = serviceAddOnData?.durationMinutes 
                           || serviceData?.durationMinutes 
                           || 15;
      
      console.log('🎯 Fetching working dates with duration:', serviceDuration, 'minutes');
      console.log('🏥 Service ID:', serviceData._id);

      // Fetch working dates
      await fetchWorkingDates(dentistData._id, serviceDuration, serviceData._id);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đặt lịch');
    }
  };

  const fetchWorkingDates = async (dentistId, serviceDuration = 15, serviceId = null) => {
    try {
      setLoading(true);
      
      const response = await slotService.getDentistWorkingDates(dentistId, serviceDuration, serviceId);
      console.log('📅 Working dates API response:', response);
      
      if (response.success && response.data.workingDates) {
        const dates = response.data.workingDates;
        setWorkingDates(dates);
        
        // Create marked dates for calendar - chỉ enable, không tô màu
        const marked = {};
        dates.forEach(dateObj => {
          marked[dateObj.date] = {
            disabled: false, // Enable dates that are in workingDates
          };
        });
        setMarkedDates(marked);
        
        if (dates.length === 0) {
          Alert.alert('Thông báo', 'Nha sỹ này hiện chưa có lịch làm việc trong thời gian tới');
        }
      } else {
        console.error('Invalid API response format:', response);
        Alert.alert('Lỗi', 'Không thể tải lịch làm việc');
      }
    } catch (error) {
      console.error('Error fetching working dates:', error);
      Alert.alert('Lỗi kết nối', error.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const isDateAvailable = (dateStr) => {
    // Check if date is in workingDates
    return workingDates.some(d => d.date === dateStr);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDataAndFetchWorkingDates();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDayPress = (day) => {
    const dateStr = day.dateString;
    
    // Check if date is available - Don't allow selection if not available
    if (!isDateAvailable(dateStr)) {
      return; // Simply return without any action
    }
    
    // Update selected date
    setSelectedDate(dateStr);
    
    // Rebuild marked dates - chỉ ngày được chọn mới có màu
    const newMarked = {};
    workingDates.forEach(dateObj => {
      if (dateObj.date === dateStr) {
        // Ngày được chọn - tô màu xanh đậm
        newMarked[dateObj.date] = {
          disabled: false,
          selected: true,
          selectedColor: COLORS.primary,
          customStyles: {
            container: {
              backgroundColor: COLORS.primary,
              borderRadius: 8,
            },
            text: {
              color: COLORS.white,
              fontWeight: 'bold',
            },
          },
        };
      } else {
        // Các ngày khác - chỉ enable, không tô màu
        newMarked[dateObj.date] = {
          disabled: false,
        };
      }
    });
    
    setMarkedDates(newMarked);
  };

  const handleContinue = async () => {
    if (!selectedDate) {
      Alert.alert('Thông báo', 'Vui lòng chọn ngày khám');
      return;
    }
    
    // Save selected date
    await AsyncStorage.setItem('booking_date', selectedDate);
    
    Alert.alert('Thành công', `Đã chọn ngày: ${formatDisplayDate(selectedDate)}`);
    
    // Navigate to select-time screen
    router.push('/booking/select-time');
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải lịch làm việc...</Text>
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
        <Text style={styles.headerTitle}>Chọn ngày khám</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
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
          
          {selectedDate && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Ngày khám:</Text>
              <View style={styles.selectedDateBadge}>
                <Ionicons name="calendar" size={14} color={COLORS.success} />
                <Text style={styles.selectedDateText}>{formatDisplayDate(selectedDate)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={getTodayString()}
            minDate={getTodayString()}
            markedDates={markedDates}
            onDayPress={handleDayPress}
            markingType={'custom'}
            disabledByDefault={true}
            disabledDaysIndexes={[]}
            theme={{
              todayTextColor: COLORS.primary,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: COLORS.white,
              arrowColor: COLORS.primary,
              monthTextColor: COLORS.text,
              textMonthFontWeight: 'bold',
              textMonthFontSize: 16,
              textDayFontSize: 14,
              textDayHeaderFontSize: 13,
              textDisabledColor: '#d9d9d9',
              disabledArrowColor: '#d9d9d9',
              'stylesheet.calendar.header': {
                week: {
                  marginTop: 5,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                },
              },
            }}
            style={styles.calendar}
          />
        </View>

        {/* Selected Date Alert */}
        {selectedDate && (
          <View style={styles.alertSuccess}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.alertText}>
              Đã chọn ngày: {formatDisplayDate(selectedDate)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        
        {selectedDate && (
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Tiếp tục</Text>
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
    width: 100,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ffe6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ff',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  calendarContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  calendar: {
    borderRadius: 8,
  },
  alertSuccess: {
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
  alertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
    paddingBottom: 30,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
