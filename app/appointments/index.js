/**
 * Appointments Screen - Lịch khám của tôi
 * @author: HoTram
 * Logic: Hiển thị danh sách lịch khám, filter theo trạng thái, xem chi tiết, hủy lịch
 */

import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import appointmentService from '../../src/services/appointmentService';

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
  completed: { color: COLORS.green, text: 'Hoàn thành', icon: 'checkmark-done-outline' },
  cancelled: { color: COLORS.red, text: 'Đã hủy', icon: 'close-circle-outline' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'checked-in', label: 'Đã check-in' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [selectedFilter, appointments]);

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

  const filterAppointments = () => {
    if (selectedFilter === 'all') {
      setFilteredAppointments(appointments);
    } else {
      const filtered = appointments.filter(
        (apt) => apt.status === selectedFilter
      );
      setFilteredAppointments(filtered);
    }
  };

  const handleViewDetail = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailModalVisible(true);
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
    const canCancel =
      appointment.status === 'pending' || appointment.status === 'confirmed';

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

    const canCancel =
      selectedAppointment.status === 'pending' ||
      selectedAppointment.status === 'confirmed';

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
                {renderStatusBadge(selectedAppointment.status)}
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

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterTab,
              selectedFilter === option.value && styles.filterTabActive,
            ]}
            onPress={() => setSelectedFilter(option.value)}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === option.value && styles.filterTabTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.white,
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
    maxHeight: '80%',
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
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
});
