/**
 * Today Appointments Screen - Chi tiết lịch khám hôm nay
 * @author: HoTram
 * Logic: Hiển thị danh sách lịch khám trong ngày hôm nay, xem chi tiết, hủy lịch
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
  confirmed: { color: COLORS.blue, text: 'Đã xác nhận', icon: 'checkmark-circle-outline' },
  'checked-in': { color: COLORS.cyan, text: 'Đã check-in', icon: 'log-in-outline' },
  completed: { color: COLORS.green, text: 'Hoàn thành', icon: 'checkmark-done-outline' },
  cancelled: { color: COLORS.red, text: 'Đã hủy', icon: 'close-circle-outline' },
};

export default function TodayAppointmentsScreen() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    loadTodayAppointments();
  }, []);

  const loadTodayAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getMyAppointments();

      if (response.success && response.data) {
        const today = dayjs().format('YYYY-MM-DD');

        // Filter appointments for today
        const todayAppts = response.data
          .filter((appointment) => {
            const apptDate = dayjs(appointment.appointmentDate).format('YYYY-MM-DD');
            return apptDate === today;
          })
          .map((apt) => ({
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

        // Sort by time
        const sortedData = todayAppts.sort((a, b) => {
          const timeA = a.startTime.replace(':', '');
          const timeB = b.startTime.replace(':', '');
          return timeA - timeB;
        });

        setAppointments(sortedData);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.log('Load today appointments error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách lịch khám');
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTodayAppointments();
  }, []);

  const handleViewDetail = (appointment) => {
    setSelectedAppointment(appointment);
    setDetailModalVisible(true);
  };

  const handleCancelAppointment = (appointment) => {
    Alert.alert(
      'Xác nhận hủy lịch khám',
      `Bạn có chắc chắn muốn hủy lịch khám lúc ${appointment.time}?`,
      [
        {
          text: 'Đóng',
          style: 'cancel',
        },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await appointmentService.cancelAppointment(
                appointment._id,
                'Bệnh nhân hủy từ ứng dụng'
              );

              if (response.success) {
                Alert.alert('Thành công', 'Đã hủy lịch khám thành công');
                loadTodayAppointments();
              } else {
                Alert.alert('Lỗi', response.message || 'Hủy lịch khám thất bại');
              }
            } catch (error) {
              console.log('Cancel appointment error:', error);
              Alert.alert('Lỗi', 'Không thể hủy lịch khám');
            }
          },
        },
      ]
    );
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
        {/* Header - Time & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.timeText}>{appointment.time}</Text>
          </View>
          {renderStatusBadge(appointment.status)}
        </View>

        {/* Dentist */}
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={18} color={COLORS.textLight} />
          <Text style={styles.cardText}>{appointment.dentist?.fullName}</Text>
        </View>

        {/* Service */}
        <View style={styles.cardRow}>
          <Ionicons name="medkit-outline" size={18} color={COLORS.textLight} />
          <Text style={styles.cardText} numberOfLines={2}>
            {appointment.service?.name}
          </Text>
        </View>

        {/* Room */}
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={18} color={COLORS.textLight} />
          <Text style={styles.cardText}>{appointment.room}{appointment.subroomName?(<Text style={{color:'grey'}}> - {appointment.subroomName}</Text>):null}</Text>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewDetail(appointment)}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.blue} />
            <Text style={[styles.actionText, { color: COLORS.blue }]}>
              Xem chi tiết
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    );
  };

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

            {/* Modal Body */}
            <ScrollView style={styles.modalBody}>
              {/* Date & Time */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Ngày khám</Text>
                <Text style={styles.detailValue}>
                  {dayjs(selectedAppointment.date).format('DD/MM/YYYY')}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Giờ khám</Text>
                <Text style={styles.detailValue}>{selectedAppointment.time}</Text>
              </View>

              {/* Dentist */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Nha sĩ</Text>
                <Text style={styles.detailValue}>
                  {selectedAppointment.dentist?.fullName}
                </Text>
              </View>

              {/* Service */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Dịch vụ</Text>
                <Text style={styles.detailValue}>
                  {selectedAppointment.service?.name}
                </Text>
              </View>

              {/* Room */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Phòng khám</Text>
                <Text style={styles.detailValue}>{selectedAppointment.room}</Text>
              </View>

              {/* buồng */}
              {selectedAppointment.subroomName&&(
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Buồng:</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.subroomName}</Text>
                </View>
              )}

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Trạng thái</Text>
                {renderStatusBadge(selectedAppointment.status)}
              </View>

              {/* Notes */}
              {selectedAppointment.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Ghi chú</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.notes}</Text>
                </View>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={80} color={COLORS.border} />
      <Text style={styles.emptyTitle}>Không có lịch khám hôm nay</Text>
      <Text style={styles.emptyText}>
        Bạn chưa có lịch khám nào trong ngày {dayjs().format('DD/MM/YYYY')}
      </Text>
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => router.push('/booking/select-service')}
      >
        <Ionicons name="add-circle-outline" size={20} color={COLORS.white} />
        <Text style={styles.bookButtonText}>Đặt lịch khám ngay</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lịch hôm nay</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch hôm nay</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Date Banner */}
      <View style={styles.dateBanner}>
        <Ionicons name="today" size={24} color={COLORS.primary} />
        <Text style={styles.dateText}>{dayjs().format('dddd, DD/MM/YYYY')}</Text>
      </View>

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
        {appointments.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={styles.countText}>
              Tổng {appointments.length} lịch khám hôm nay
            </Text>
            {appointments.map(renderAppointmentCard)}
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
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#e6f7ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
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
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
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
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
