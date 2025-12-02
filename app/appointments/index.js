/**
 * Appointments Screen - Lịch khám của tôi
 * @author: HoTram
 * Logic: Hiển thị danh sách lịch khám, filter theo trạng thái, xem chi tiết, hủy lịch
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import appointmentService from '../../src/services/appointmentService';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

dayjs.locale('vi');

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
  blue: '#1890ff',
  cyan: '#13c2c2',
  green: '#52c41a',
  red: '#ff4d4f',
};

const STATUS_CONFIG = {
  pending: { color: COLORS.gold, text: 'Chờ xác nhận', icon: 'time-outline' },
  confirmed: { color: COLORS.blue, text: 'Đã xác nhận', icon: 'checkmark-circle-outline' },
  'checked-in': { color: COLORS.cyan, text: 'Đã check-in', icon: 'log-in-outline' },
  'in-progress': { color: '#9c27b0', text: 'Đang khám', icon: 'medical-outline' },
  completed: { color: COLORS.green, text: 'Hoàn thành', icon: 'checkmark-done-outline' },
  cancelled: { color: COLORS.red, text: 'Đã hủy', icon: 'close-circle-outline' },
  'pending-cancellation': { color: '#ff9800', text: 'Đang yêu cầu hủy', icon: 'alert-circle-outline' },
  'no-show': { color: COLORS.textLight, text: 'Không đến', icon: 'remove-circle-outline' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'checked-in', label: 'Đã check-in' },
  { value: 'in-progress', label: 'Đang khám' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'pending-cancellation', label: 'Đang yêu cầu hủy' },
  { value: 'no-show', label: 'Không đến' },
];

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'thisWeek', label: 'Tuần này' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'lastMonth', label: 'Tháng trước' },
  { value: 'custom', label: 'Tùy chỉnh (Từ - Đến)', icon: 'calendar-outline' },
];

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [dateFilterDropdownVisible, setDateFilterDropdownVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, selectedDateFilter, appointments, customStartDate, customEndDate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getMyAppointments();

      if (response.success && response.data) {
        // Map API response to component format
        const mappedData = response.data.map((apt) => ({
          ...apt,
          date: apt.appointmentDate,
          time: `${apt.startTime} - ${apt.endTime}`,
          dentist: {
            fullName: apt.dentistName,
          },
          service: {
            name: apt.serviceName,
          },
          room: apt.roomName || 'Chưa xác định',
        }));

        // Sort by date descending (newest first)
        const sortedData = mappedData.sort((a, b) =>
          dayjs(b.date).diff(dayjs(a.date))
        );

        setAppointments(sortedData);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('❌ Load appointments error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách lịch khám');
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAppointments();
  }, []);

  const filterAppointments = useCallback(() => {
    let filtered = appointments;

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((apt) => apt.status === selectedFilter);
    }

    // Filter by date
    if (selectedDateFilter !== 'all') {
      console.log('Filtering by date:', selectedDateFilter);
      if (selectedDateFilter === 'custom') {
        console.log('Custom dates:', { customStartDate, customEndDate });
      }
      const today = dayjs();
      filtered = filtered.filter((apt) => {
        const aptDate = dayjs(apt.date);
        
        switch (selectedDateFilter) {
          case 'today':
            return aptDate.isSame(today, 'day');
          case 'thisWeek':
            return aptDate.isSame(today, 'week');
          case 'thisMonth':
            return aptDate.isSame(today, 'month');
          case 'lastMonth':
            return aptDate.isSame(today.subtract(1, 'month'), 'month');
          case 'custom':
            if (!customStartDate && !customEndDate) return true;
            if (customStartDate && !customEndDate) {
              return aptDate.isSameOrAfter(dayjs(customStartDate), 'day');
            }
            if (!customStartDate && customEndDate) {
              return aptDate.isSameOrBefore(dayjs(customEndDate), 'day');
            }
            return aptDate.isSameOrAfter(dayjs(customStartDate), 'day') && 
                   aptDate.isSameOrBefore(dayjs(customEndDate), 'day');
          default:
            return true;
        }
      });
    }

    setFilteredAppointments(filtered);
  }, [appointments, selectedFilter, selectedDateFilter, customStartDate, customEndDate]);

  //  Check if can request cancellation (>=24 hours before appointment)
  const canRequestCancellation = (appointment) => {
    if (appointment.status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const appointmentDateTime = new Date(appointment.appointmentDate || appointment.date);
    
    // Parse startTime (format: "HH:MM")
    const startTime = appointment.startTime || appointment.time?.split(' - ')[0];
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
    }
    
    const timeDiff = appointmentDateTime - now;
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours
    
    return timeDiff >= oneDayInMs;
  };

  const handleViewDetail = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailModalVisible(true);
  };

  const handleRequestCancellation = (appointment) => {
    setAppointmentToCancel(appointment);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleCancelSubmit = async () => {
    try {
      // Validate reason
      if (!cancelReason || cancelReason.trim().length === 0) {
        Alert.alert('Lỗi', 'Vui lòng nhập lý do hủy lịch khám');
        return;
      }
      
      if (cancelReason.trim().length < 10) {
        Alert.alert('Lỗi', 'Lý do phải có ít nhất 10 ký tự');
        return;
      }
      
      const response = await appointmentService.requestCancellation(
        appointmentToCancel._id,
        cancelReason
      );
      
      if (response.success) {
        Alert.alert('Thành công', 'Đã gửi yêu cầu hủy lịch khám. Vui lòng chờ xác nhận từ phòng khám.');
        setCancelModalVisible(false);
        setAppointmentToCancel(null);
        setCancelReason('');
        loadAppointments();
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể gửi yêu cầu hủy');
      }
    } catch (error) {
      console.error('❌ Request cancellation error:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Gửi yêu cầu hủy thất bại');
    }
  };

  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || {
      color: COLORS.textLight,
      text: status,
      icon: 'help-circle-outline',
    };

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  const renderAppointmentCard = (appointment) => {
    return (
      <View key={appointment._id} style={styles.appointmentCard}>
        {/* Header - Date & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.dateText}>
              {dayjs(appointment.date).format('DD/MM/YYYY')}
            </Text>
          </View>
          {renderStatusBadge(appointment.status)}
        </View>

        {/* Time */}
        <View style={styles.cardRow}>
          <Ionicons name="time-outline" size={18} color={COLORS.textLight} />
          <Text style={styles.cardText}>{appointment.time}</Text>
        </View>

        {/* Dentist */}
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={18} color={COLORS.textLight} />
          <Text style={styles.cardText}>{appointment.dentist?.fullName}</Text>
        </View>

        {/* Service */}
        <View style={styles.cardRow}>
          <Ionicons
            name="medkit-outline"
            size={18}
            color={COLORS.textLight}
          />
          <Text style={styles.cardText} numberOfLines={2}>
            {appointment.service?.name}
          </Text>
        </View>

        {/* Room */}
        <View style={styles.cardRow}>
          <Ionicons
            name="location-outline"
            size={18}
            color={COLORS.textLight}
          />
          <Text style={styles.cardText}>{appointment.room}{appointment.subroomName?(<Text style={{color:'gray'}}> - {appointment.subroomName}</Text>):null}</Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleViewDetail(appointment)}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
              Chi tiết
            </Text>
          </TouchableOpacity>

          {canRequestCancellation(appointment) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleRequestCancellation(appointment)}
            >
              <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
              <Text style={[styles.actionButtonText, { color: COLORS.error }]}>
                Gửi yêu cầu hủy
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={80} color={COLORS.border} />
      <Text style={styles.emptyTitle}>Chưa có lịch khám nào</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all'
          ? 'Bạn chưa có lịch khám nào'
          : `Không có lịch khám "${FILTER_OPTIONS.find(f => f.value === selectedFilter)?.label}"`}
      </Text>
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => router.push('/booking/select-service')}
      >
        <Text style={styles.bookButtonText}>Đặt lịch khám ngay</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetailModal = () => {
    if (!selectedAppointment) return null;

    return (
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết lịch khám</Text>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
            {/* Appointment Code */}
              {selectedAppointment.appointmentCode && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã lịch khám:</Text>
                  <Text style={[styles.detailValue, styles.codeText]}>
                    {selectedAppointment.appointmentCode}
                  </Text>
                </View>
              )}
              {/* Status */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trạng thái:</Text>
                <Text>{renderStatusBadge(selectedAppointment.status)}</Text>
              </View>
              
              {/* Date */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ngày khám:</Text>
                <Text style={styles.detailValue}>
                  {dayjs(selectedAppointment.date).format('DD/MM/YYYY')}
                </Text>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Giờ khám:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.time}</Text>
              </View>

              {/* Dentist */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nha sĩ:</Text>
                <Text style={styles.detailValue}>
                  {selectedAppointment.dentist?.fullName}
                </Text>
              </View>

              {/* Room */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phòng khám:</Text>
                <Text style={styles.detailValue}>
                    {selectedAppointment.room}
                </Text>

              </View>

              {/* Buồng */}
              {selectedAppointment.subroomName&&(
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Buồng:</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.subroomName}</Text>
                </View>
              )
              } 

              {/* Service */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dịch vụ:</Text>
                <Text style={styles.detailValue}>
                  {selectedAppointment.service?.name}
                </Text>
              </View>

              {/* Notes */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ghi chú:</Text>
                <Text style={styles.detailValue}>
                  {selectedAppointment.notes || 'Không có'}
                </Text>
              </View>

              
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Đóng</Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách lịch khám...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch khám của tôi</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        {/* Filter Row with 2 columns */}
        <View style={styles.filterRow}>
          {/* Status Filter */}
          <View style={styles.filterColumn}>
            <Text style={styles.filterLabel}>Trạng thái:</Text>
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => {
                setFilterDropdownVisible(!filterDropdownVisible);
                setDateFilterDropdownVisible(false);
              }}
            >
              <Text style={styles.filterDropdownText} numberOfLines={1}>
                {FILTER_OPTIONS.find((opt) => opt.value === selectedFilter)?.label || 'Tất cả'}
              </Text>
              <Ionicons 
                name={filterDropdownVisible ? "chevron-up" : "chevron-down"} 
                size={18} 
                color={COLORS.text} 
              />
            </TouchableOpacity>
          </View>

          {/* Date Filter */}
          <View style={styles.filterColumn}>
            <Text style={styles.filterLabel}>Thời gian:</Text>
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => {
                setDateFilterDropdownVisible(!dateFilterDropdownVisible);
                setFilterDropdownVisible(false);
              }}
            >
              <Text style={styles.filterDropdownText} numberOfLines={1}>
                {DATE_FILTER_OPTIONS.find((opt) => opt.value === selectedDateFilter)?.label || 'Tất cả'}
              </Text>
              <Ionicons 
                name={dateFilterDropdownVisible ? "chevron-up" : "chevron-down"} 
                size={18} 
                color={COLORS.text} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Range Picker - Chỉ show ra khi "Tùy chỉnh" được chọn */}
        {selectedDateFilter === 'custom' && (
          <View style={styles.customDateContainer}>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={styles.datePickerLabel}>Từ:</Text>
                <Text style={styles.datePickerValue}>
                  {customStartDate ? dayjs(customStartDate).format('DD/MM/YYYY') : 'Chọn'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={styles.datePickerLabel}>Đến:</Text>
                <Text style={styles.datePickerValue}>
                  {customEndDate ? dayjs(customEndDate).format('DD/MM/YYYY') : 'Chọn'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clear Custom Dates Button */}
            {(customStartDate || customEndDate) && (
              <TouchableOpacity
                style={styles.clearDatesButton}
                onPress={() => {
                  setCustomStartDate(null);
                  setCustomEndDate(null);
                }}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.error} />
                <Text style={styles.clearDatesText}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Status Dropdown Modal */}
      <Modal
        visible={filterDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setFilterDropdownVisible(false)}
        >
          <View style={[styles.dropdownMenuModal, { top: 170, left: 16, right: '50%', marginRight: 6 }]}>
            <ScrollView style={styles.dropdownScroll}>
              {FILTER_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    selectedFilter === option.value && styles.dropdownItemActive,
                    index === FILTER_OPTIONS.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    setSelectedFilter(option.value);
                    setFilterDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedFilter === option.value && styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedFilter === option.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Dropdown Modal */}
      <Modal
        visible={dateFilterDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDateFilterDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDateFilterDropdownVisible(false)}
        >
          <View style={[styles.dropdownMenuModal, { top: 170, left: '50%', right: 16, marginLeft: 6 }]}>
            <ScrollView style={styles.dropdownScroll}>
              {DATE_FILTER_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    selectedDateFilter === option.value && styles.dropdownItemActive,
                    index === DATE_FILTER_OPTIONS.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => {
                    setSelectedDateFilter(option.value);
                    setDateFilterDropdownVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedDateFilter === option.value && styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedDateFilter === option.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Appointments List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {filteredAppointments.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={styles.countText}>
              Tổng {filteredAppointments.length} lịch khám
            </Text>
            {filteredAppointments.map(renderAppointmentCard)}
          </>
        )}
      </ScrollView>

      {/* Detail Modal */}
      {renderDetailModal()}

      {/* Start Date Picker */}
      {showStartDatePicker && (
        <DateTimePicker
          value={customStartDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setCustomStartDate(selectedDate);
              // If end date is before start date, clear it
              if (customEndDate && selectedDate > customEndDate) {
                setCustomEndDate(null);
              }
            }
          }}
        />
      )}

      {/* End Date Picker */}
      {showEndDatePicker && (
        <DateTimePicker
          value={customEndDate || customStartDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={customStartDate || undefined}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setCustomEndDate(selectedDate);
            }
          }}
        />
      )}

      {/* Cancel Request Modal */}
      <Modal
        visible={cancelModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setCancelModalVisible(false);
          setAppointmentToCancel(null);
          setCancelReason('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                <Ionicons name="close-circle-outline" size={20} /> Yêu cầu hủy lịch khám
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCancelModalVisible(false);
                  setAppointmentToCancel(null);
                  setCancelReason('');
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {appointmentToCancel && (
                <>
                  {/* Appointment Info */}
                  <View style={styles.cancelInfoContainer}>
                    <Text style={styles.cancelInfoText}>Bạn đang yêu cầu hủy lịch khám:</Text>
                    <View style={styles.cancelInfoBox}>
                      <View style={styles.cancelInfoRow}>
                        <Text style={styles.cancelInfoLabel}>Ngày:</Text>
                        <Text style={styles.cancelInfoValue}>
                          {dayjs(appointmentToCancel.date).format('DD/MM/YYYY')}
                        </Text>
                      </View>
                      <View style={styles.cancelInfoRow}>
                        <Text style={styles.cancelInfoLabel}>Giờ:</Text>
                        <Text style={styles.cancelInfoValue}>{appointmentToCancel.time}</Text>
                      </View>
                      <View style={styles.cancelInfoRow}>
                        <Text style={styles.cancelInfoLabel}>Bác sĩ:</Text>
                        <Text style={styles.cancelInfoValue}>
                          {appointmentToCancel.dentist?.fullName}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Reason Input */}
                  <View style={styles.reasonContainer}>
                    <Text style={styles.reasonLabel}>* Lý do hủy:</Text>
                    <TextInput
                      style={styles.reasonInput}
                      placeholder="Vui lòng cho chúng tôi biết lý do bạn muốn hủy lịch khám..."
                      placeholderTextColor={COLORS.textLight}
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                      value={cancelReason}
                      onChangeText={setCancelReason}
                      textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{cancelReason.length}/500</Text>
                  </View>

                  {/* Warning */}
                  <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={20} color="#ff9800" />
                    <View style={styles.warningContent}>
                      <Text style={styles.warningTitle}>Lưu ý</Text>
                      <Text style={styles.warningText}>
                        Yêu cầu hủy lịch sẽ được gửi đến phòng khám để xem xét. Bạn sẽ nhận được thông báo khi yêu cầu được xử lý.
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setCancelModalVisible(false);
                  setAppointmentToCancel(null);
                  setCancelReason('');
                }}
              >
                <Text style={styles.modalCloseButtonText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelSubmit}
              >
                <Text style={styles.modalCancelButtonText}>Gửi yêu cầu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterColumn: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
    fontWeight: '500',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  filterDropdownText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  customDateContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  datePickerLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  datePickerValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  clearDatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    gap: 4,
  },
  clearDatesText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '500',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownMenuModal: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownScroll: {
    flexGrow: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.primary + '10',
  },
  dropdownItemText: {
    fontSize: 15,
    color: COLORS.text,
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
    fontWeight: '500',
  },
  appointmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewButton: {
    backgroundColor: COLORS.primary + '15',
  },
  cancelButton: {
    backgroundColor: COLORS.error + '15',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  codeText: {
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop:-10
  },
  modalCloseButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  cancelInfoContainer: {
    marginBottom: 20,
  },
  cancelInfoText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },
  cancelInfoBox: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  cancelInfoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  cancelInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    width: 80,
  },
  cancelInfoValue: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  reasonContainer: {
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb74d',
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
});
