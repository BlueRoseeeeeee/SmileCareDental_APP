/**
 * @author: HoTram
 * Booking Select Dentist Screen - Chọn nha sĩ
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
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import slotService from '../../src/services/slotService';
import recordService from '../../src/services/recordService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  primary: '#2596be',
  secondary: '#2c5f4f',
  gold: '#BE8600',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
  success: '#34a853',
  warning: '#fbbc04',
  error: '#ea4335',
};

// Map working days
const DAY_MAP = {
  'monday': 'T2',
  'tuesday': 'T3',
  'wednesday': 'T4',
  'thursday': 'T5',
  'friday': 'T6',
  'saturday': 'T7',
  'sunday': 'CN',
};

export default function BookingSelectDentistScreen() {
  const { user } = useAuth();
  const [dentists, setDentists] = useState([]);
  const [filteredDentists, setFilteredDentists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [examDentistId, setExamDentistId] = useState(null);
  const [service, setService] = useState(null);
  const [serviceAddOn, setServiceAddOn] = useState(null);

  useEffect(() => {
    loadServiceAndFetchDentists();
  }, []);

  const loadServiceAndFetchDentists = async () => {
    try {
      // Load service và addon từ AsyncStorage
      const savedService = await AsyncStorage.getItem('booking_service');
      const savedServiceAddOn = await AsyncStorage.getItem('booking_serviceAddOn');
      const recordId = await AsyncStorage.getItem('booking_recordId');
      
      if (!savedService) {
        Alert.alert('Lỗi', 'Vui lòng chọn dịch vụ trước');
        router.replace('/booking/select-service');
        return;
      }

      const serviceData = JSON.parse(savedService);
      const serviceAddOnData = savedServiceAddOn ? JSON.parse(savedServiceAddOn) : null;
      
      setService(serviceData);
      setServiceAddOn(serviceAddOnData);

      console.log('📦 Service:', serviceData.name);
      console.log('📦 AddOn:', serviceAddOnData?.name || 'none');
      console.log('🏥 Service ID:', serviceData._id);
      console.log('🏥 Allowed RoomTypes:', serviceData.allowedRoomTypes);

      // Load exam dentist if recordId exists
      if (recordId) {
        await loadExamDentistFromRecord(recordId);
      }

      // Calculate service duration
      let serviceDuration = 15; // Default

      if (serviceAddOnData?.durationMinutes) {
        // User đã chọn addon cụ thể → dùng duration của addon đó
        serviceDuration = serviceAddOnData.durationMinutes;
        console.log('🎯 Using selected addon duration:', serviceDuration, 'minutes');
      } else if (serviceData.serviceAddOns && serviceData.serviceAddOns.length > 0) {
        // Không chọn addon → lấy duration dài nhất
        const maxDuration = Math.max(...serviceData.serviceAddOns.map(addon => addon.durationMinutes || 15));
        serviceDuration = maxDuration;
        console.log('🎯 Using max addon duration:', serviceDuration, 'minutes (from', serviceData.serviceAddOns.length, 'addons)');
      } else if (serviceData.durationMinutes) {
        // Fallback to service default duration
        serviceDuration = serviceData.durationMinutes;
        console.log('🎯 Using service default duration:', serviceDuration, 'minutes');
      }

      // Fetch dentists
      await fetchDentists(serviceDuration, serviceData._id);
    } catch (error) {
      console.error('Error loading service:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin dịch vụ');
    }
  };

  const loadExamDentistFromRecord = async (recordId) => {
    try {
      console.log('🔍 Loading exam dentist from record:', recordId);
      const response = await recordService.getRecordById(recordId);
      
      if (response.success && response.data && response.data.dentistId) {
        setExamDentistId(response.data.dentistId);
        console.log('✅ Exam dentist ID:', response.data.dentistId, '| Name:', response.data.dentistName);
      }
    } catch (error) {
      console.warn('⚠️ Could not load exam dentist from record:', error.message);
      // Not critical, just won't show the badge
    }
  };

  const fetchDentists = async (serviceDuration = 15, serviceId = null) => {
    try {
      setLoading(true);
      
      const response = await slotService.getDentistsWithNearestSlot(serviceDuration, serviceId);
      console.log('👨‍⚕️ Dentists API response:', response);
      
      if (response.success && response.data.dentists) {
        setDentists(response.data.dentists);
        setFilteredDentists(response.data.dentists);
        
        if (response.data.dentists.length === 0) {
          Alert.alert('Thông báo', 'Hiện tại chưa có nha sỹ nào có lịch khám phù hợp với dịch vụ này');
        }
      } else {
        console.error('Invalid API response format:', response);
        Alert.alert('Lỗi', 'Không thể tải danh sách nha sỹ');
      }
    } catch (error) {
      console.error('Error fetching dentists:', error);
      Alert.alert('Lỗi kết nối', error.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    if (!value.trim()) {
      setFilteredDentists(dentists);
      return;
    }
    
    const filtered = dentists.filter(dentist => 
      dentist.fullName?.toLowerCase().includes(value.toLowerCase()) ||
      dentist.email?.toLowerCase().includes(value.toLowerCase()) ||
      dentist.specialization?.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredDentists(filtered);
  };

  const handleSelectDentist = async (dentist) => {
    // Lưu dentist vào AsyncStorage
    await AsyncStorage.setItem('booking_dentist', JSON.stringify(dentist));
    
    Alert.alert('Thành công', `Đã chọn nha sỹ: ${dentist.fullName}`);
    
    // Navigate to select-date screen (will be created next)
    router.push('/booking/select-date');
  };

  const handleBack = () => {
    router.back();
  };

  if (loading && dentists.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách nha sỹ...</Text>
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
        <Text style={styles.headerTitle}>Chọn nha sỹ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Service Info */}
        {service && (
          <View style={styles.serviceInfoContainer}>
            <View style={styles.serviceInfoRow}>
              <Text style={styles.serviceInfoLabel}>Dịch vụ:</Text>
              <Text style={styles.serviceInfoValue}>{service.name}</Text>
            </View>
            {serviceAddOn && (
              <View style={styles.serviceInfoRow}>
                <Text style={styles.serviceInfoLabel}>Gói:</Text>
                <Text style={styles.serviceInfoValue}>{serviceAddOn.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm bác sĩ theo tên, email, chuyên môn..."
            value={searchValue}
            onChangeText={handleSearch}
            placeholderTextColor={COLORS.textLight}
          />
          {searchValue.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Dentists List */}
        {filteredDentists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyText}>
              {searchValue ? 'Không tìm thấy bác sĩ phù hợp' : 'Chưa có bác sĩ nào'}
            </Text>
          </View>
        ) : (
          filteredDentists.map((dentist) => {
            const isExamDentist = examDentistId && dentist._id === examDentistId;
            
            return (
              <TouchableOpacity
                key={dentist._id}
                style={[styles.dentistCard, isExamDentist && styles.dentistCardExam]}
                onPress={() => handleSelectDentist(dentist)}
              >
                {/* Dentist Avatar & Info */}
                <View style={styles.dentistHeader}>
                  {dentist.avatar ? (
                    <Image
                      source={{ uri: dentist.avatar }}
                      style={styles.dentistAvatar}
                    />
                  ) : (
                    <View style={[styles.dentistAvatar, styles.dentistAvatarPlaceholder]}>
                      <Ionicons name="person" size={40} color={COLORS.white} />
                    </View>
                  )}
                  <View style={styles.dentistInfo}>
                    <View style={styles.dentistNameRow}>
                      <Text style={styles.dentistName}>
                        {dentist.title || 'NS.'} {dentist.fullName}
                      </Text>
                      {isExamDentist && (
                        <View style={styles.examBadge}>
                          <Ionicons name="star" size={12} color={COLORS.white} />
                          <Text style={styles.examBadgeText}>Nha sỹ đã khám</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.dentistDetailRow}>
                      <Ionicons name="male-female-outline" size={14} color={COLORS.textLight} />
                      <Text style={styles.dentistDetailText}>
                        Giới tính: {dentist.gender === 'male' ? 'Nam' : dentist.gender === 'female' ? 'Nữ' : 'Khác'}
                      </Text>
                    </View>
                    {dentist.specialization && (
                      <View style={styles.dentistDetailRow}>
                        <Ionicons name="school-outline" size={14} color={COLORS.textLight} />
                        <Text style={styles.dentistDetailText}>
                          Chuyên môn: {dentist.specialization}
                        </Text>
                      </View>
                    )}
                    {dentist.experience && (
                      <View style={styles.dentistDetailRow}>
                        <Ionicons name="medal-outline" size={14} color={COLORS.textLight} />
                        <Text style={styles.dentistDetailText}>
                          Kinh nghiệm: {dentist.experience} năm
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Nearest Slot */}
                {dentist.nearestSlot && (
                  <View style={styles.slotContainer}>
                    <Ionicons name="time-outline" size={16} color={COLORS.success} />
                    <Text style={styles.slotText}>
                      Slot gần nhất: {dentist.nearestSlot.date} | {dentist.nearestSlot.startTime} - {dentist.nearestSlot.endTime}
                    </Text>
                  </View>
                )}

                {/* Working Days */}
                <View style={styles.workingDaysContainer}>
                  <Text style={styles.workingDaysLabel}>Lịch làm việc:</Text>
                  {dentist.workingDays && dentist.workingDays.length > 0 ? (
                    <View style={styles.workingDaysList}>
                      {dentist.workingDays.map((day, index) => (
                        <View key={index} style={styles.workingDayChip}>
                          <Text style={styles.workingDayText}>
                            {DAY_MAP[day] || day}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.workingDaysEmpty}>Chưa cập nhật</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backButtonText}>Quay lại</Text>
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
  serviceInfoContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
  },
  serviceInfoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  serviceInfoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 80,
  },
  serviceInfoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight,
  },
  dentistCard: {
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
  dentistCardExam: {
    borderColor: COLORS.primary,
    backgroundColor: '#e6f4ff',
  },
  dentistHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dentistAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
  },
  dentistAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  dentistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dentistNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  dentistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gold,
  },
  examBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
    gap: 4,
  },
  examBadgeText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  dentistDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  dentistDetailText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  slotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ffe6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  slotText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  workingDaysContainer: {
    marginTop: 8,
  },
  workingDaysLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  workingDaysList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  workingDayChip: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  workingDayText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  workingDaysEmpty: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  backButton: {
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
});
