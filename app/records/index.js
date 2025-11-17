/**
 * Records Screen - Hồ sơ bệnh án của tôi
 * @author: HoTram
 * Logic: Hiển thị danh sách hồ sơ bệnh án, xem chi tiết
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import recordService from '../../src/services/recordService';

dayjs.locale('vi');

const COLORS = {
  primary: '#2596be',
  secondary: '#2c5f4f',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  blue: '#1890ff',
  green: '#52c41a',
  cyan: '#13c2c2',
  red: '#ff4d4f',
  orange: '#ff7a45',
  processing: '#1890ff',
};

const STATUS_CONFIG = {
  pending: { color: COLORS.processing, text: 'Chờ xử lý', icon: 'time-outline' },
  'in-progress': { color: COLORS.warning, text: 'Đang điều trị', icon: 'medical-outline' },
  completed: { color: COLORS.success, text: 'Hoàn thành', icon: 'checkmark-circle-outline' },
  cancelled: { color: COLORS.textLight, text: 'Đã hủy', icon: 'close-circle-outline' },
};

const TYPE_CONFIG = {
  exam: { color: COLORS.blue, text: 'Khám', icon: 'search-outline' },
  treatment: { color: COLORS.green, text: 'Điều trị', icon: 'medkit-outline' },
  checkup: { color: COLORS.cyan, text: 'Tái khám', icon: 'refresh-outline' },
  emergency: { color: COLORS.red, text: 'Cấp cứu', icon: 'alert-circle-outline' },
};

const PRIORITY_CONFIG = {
  urgent: { color: COLORS.red, text: 'Khẩn cấp' },
  high: { color: COLORS.orange, text: 'Cao' },
  normal: { color: COLORS.textLight, text: 'Bình thường' },
};

const PAYMENT_STATUS_CONFIG = {
  paid: { color: COLORS.success, text: 'Đã thanh toán' },
  unpaid: { color: COLORS.warning, text: 'Chưa thanh toán' },
  pending: { color: COLORS.processing, text: 'Đang xử lý' },
};

export default function RecordsScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  // Filter states
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    if (user?._id) {
      loadRecords();
    }
  }, [user?._id]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!user?._id) return;

    const intervalId = setInterval(() => {
      loadRecords(true); // Silent refresh
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [user?._id]);

  const loadRecords = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      console.log('🔍 [DEBUG] Loading records for user._id:', user._id);
      const response = await recordService.getRecordsByPatient(user._id);
      console.log('🔍 [DEBUG] Records response:', response);

      if (response.success && response.data) {
        console.log('🔍 [DEBUG] Records count:', response.data.length);
        // Sort by createdAt descending (newest first)
        const sortedData = response.data.sort((a, b) =>
          dayjs(b.createdAt).diff(dayjs(a.createdAt))
        );
        setRecords(sortedData);
      } else {
        console.log('⚠️ [DEBUG] No records or failed response');
        setRecords([]);
      }
    } catch (error) {
      console.error('❌ Load records error:', error);
      if (!silent) {
        Alert.alert('Lỗi', 'Không thể tải danh sách hồ sơ');
      }
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterRecords = useCallback(() => {
    let filtered = records;

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter(record => {
        const recordDate = dayjs(record.createdAt);
        const start = startDate ? dayjs(startDate).startOf('day') : null;
        const end = endDate ? dayjs(endDate).endOf('day') : null;

        if (start && end) {
          return recordDate.isAfter(start) && recordDate.isBefore(end);
        } else if (start) {
          return recordDate.isAfter(start);
        } else if (end) {
          return recordDate.isBefore(end);
        }
        return true;
      });
    }

    return filtered;
  }, [records, startDate, endDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecords();
  }, []);

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || {
      color: COLORS.textLight,
      text: status,
      icon: 'help-circle-outline',
    };

    return (
      <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.badgeText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  const renderTypeBadge = (type) => {
    const config = TYPE_CONFIG[type] || {
      color: COLORS.textLight,
      text: type,
      icon: 'document-outline',
    };

    return (
      <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.badgeText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    );
  };

  const renderRecordCard = (record) => {
    return (
      <TouchableOpacity
        key={record._id}
        style={styles.recordCard}
        onPress={() => handleViewDetail(record)}
        activeOpacity={0.7}
      >
        {/* Header - Code & Type */}
        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
            <Text style={styles.codeText}>{record.recordCode || 'N/A'}</Text>
          </View>
          {renderTypeBadge(record.type)}
        </View>

        {/* Date */}
        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.cardLabel}>Ngày tạo:</Text>
          <Text style={styles.cardValue}>
            {dayjs(record.createdAt).format('DD/MM/YYYY HH:mm')}
          </Text>
        </View>

        {/* Dentist */}
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.cardLabel}>Nha sĩ:</Text>
          <Text style={styles.cardValue} numberOfLines={1}>
            {record.dentistName || 'N/A'}
          </Text>
        </View>

        {/* Service */}
        <View style={styles.cardRow}>
          <Ionicons name="medkit-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.cardLabel}>Dịch vụ:</Text>
          <Text style={styles.cardValue} numberOfLines={1}>
            {record.serviceName || 'N/A'}
          </Text>
        </View>

        {/* Service AddOn if exists */}
        {record.serviceAddOnName && (
          <View style={[styles.cardRow, { marginLeft: 24 }]}>
            <Text style={styles.cardSubValue} numberOfLines={1}>
              <MaterialIcons name="subdirectory-arrow-right" size={15} color="grey" /> 
              {record.serviceAddOnName}
            </Text>
          </View>
        )}

        {/* Room */}
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.cardLabel}>Phòng:</Text>
          <Text style={styles.cardValue}>
            {record.roomName || 'N/A'}
            {record.subroomName && ` - ${record.subroomName}`}
          </Text>
        </View>

        {/* Diagnosis */}
        {record.diagnosis && (
          <View style={styles.cardRow}>
            <Ionicons name="clipboard-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.cardLabel}>Chẩn đoán:</Text>
            <Text style={styles.cardValue} numberOfLines={2}>
              {record.diagnosis}
            </Text>
          </View>
        )}

        {/* Total Cost */}
        {record.totalCost && (
          <View style={styles.cardRow}>
            <Ionicons name="cash-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.cardLabel}>Tổng chi phí:</Text>
            <Text style={[styles.cardValue, styles.priceText]}>
              {record.totalCost.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        )}

        {/* Footer - Status */}
        <View style={styles.cardFooter}>
          {renderStatusBadge(record.status)}
          <TouchableOpacity
            style={styles.viewDetailButton}
            onPress={() => handleViewDetail(record)}
          >
            <Text style={styles.viewDetailText}>Chi tiết</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color={COLORS.border} />
      <Text style={styles.emptyTitle}>Chưa có hồ sơ nào</Text>
      <Text style={styles.emptySubtitle}>
        Bạn chưa có hồ sơ bệnh án nào trong hệ thống
      </Text>
    </View>
  );

  const renderDetailModal = () => {
    if (!selectedRecord) return null;

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
              <View style={styles.modalTitleRow}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Chi tiết hồ sơ</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Record Code */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã hồ sơ:</Text>
                  <Text style={[styles.detailValue, styles.codeValue]}>
                    {selectedRecord.recordCode || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày tạo:</Text>
                  <Text style={styles.detailValue}>
                    {dayjs(selectedRecord.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Loại:</Text>
                  {renderTypeBadge(selectedRecord.type)}
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  {renderStatusBadge(selectedRecord.status)}
                </View>
              </View>

              {/* Doctor & Room */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Nha sĩ & Phòng khám</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nha sĩ:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.dentistName || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phòng khám:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.roomName || 'N/A'}
                  </Text>
                </View>
                {selectedRecord.subroomName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Buồng:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRecord.subroomName}
                    </Text>
                  </View>
                )}
              </View>

              {/* Services */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Dịch vụ</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dịch vụ:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRecord.serviceName || 'N/A'}
                  </Text>
                </View>
                {selectedRecord.serviceAddOnName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dịch vụ bổ sung:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRecord.serviceAddOnName}
                    </Text>
                  </View>
                )}
                {selectedRecord.servicePrice && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Giá dịch vụ:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRecord.servicePrice.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                )}
                {selectedRecord.serviceAddOnPrice && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Giá DV bổ sung:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRecord.serviceAddOnPrice.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                )}
                {selectedRecord.quantity && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Số lượng:</Text>
                    <Text style={styles.detailValue}>{selectedRecord.quantity}</Text>
                  </View>
                )}
                {selectedRecord.totalCost && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tổng chi phí:</Text>
                    <Text style={[styles.detailValue, styles.totalCostValue]}>
                      {selectedRecord.totalCost.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                )}
              </View>

              {/* Medical Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thông tin y khoa</Text>
                
                {selectedRecord.indications && selectedRecord.indications.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Triệu chứng:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRecord.indications.join(', ')}
                    </Text>
                  </View>
                )}

                {selectedRecord.diagnosis && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Chẩn đoán:</Text>
                    <Text style={styles.detailValue}>{selectedRecord.diagnosis}</Text>
                  </View>
                )}

                {selectedRecord.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ghi chú:</Text>
                    <Text style={styles.detailValue}>{selectedRecord.notes}</Text>
                  </View>
                )}
              </View>

              {/* Treatment Indications */}
              {selectedRecord.treatmentIndications && 
               selectedRecord.treatmentIndications.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Kế hoạch điều trị</Text>
                  {selectedRecord.treatmentIndications.map((indication, index) => (
                    <View key={index} style={styles.treatmentItem}>
                      <View style={styles.treatmentHeader}>
                        <Text style={styles.treatmentName}>
                          {indication.serviceName}
                        </Text>
                        <View
                          style={[
                            styles.usedBadge,
                            { 
                              backgroundColor: indication.used 
                                ? COLORS.success + '20' 
                                : COLORS.textLight + '20' 
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.usedText,
                              { 
                                color: indication.used 
                                  ? COLORS.success 
                                  : COLORS.textLight 
                              },
                            ]}
                          >
                            {indication.used ? 'Đã sử dụng' : 'Chưa sử dụng'}
                          </Text>
                        </View>
                      </View>
                      {indication.serviceAddOnName && (
                        <Text style={styles.treatmentAddOn}>
                          {indication.serviceAddOnName}
                        </Text>
                      )}
                      {indication.notes && (
                        <Text style={styles.treatmentNotes}>
                          Ghi chú: {indication.notes}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Additional Services */}
              {selectedRecord.additionalServices && 
               selectedRecord.additionalServices.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Dịch vụ bổ sung</Text>
                  {selectedRecord.additionalServices.map((service, index) => (
                    <View key={index} style={styles.additionalServiceItem}>
                      <Text style={styles.additionalServiceName}>
                        {service.serviceName}
                      </Text>
                      {service.serviceAddOnName && (
                        <Text style={styles.additionalServiceAddOn}>
                          {service.serviceAddOnName}
                        </Text>
                      )}
                      {service.price && (
                        <Text style={styles.additionalServicePrice}>
                          {service.price.toLocaleString('vi-VN')} đ
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Other Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thông tin khác</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Kênh đặt:</Text>
                  <View
                    style={[
                      styles.channelBadge,
                      { 
                        backgroundColor: selectedRecord.bookingChannel === 'online' 
                          ? COLORS.blue + '20' 
                          : COLORS.green + '20' 
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.channelText,
                        { 
                          color: selectedRecord.bookingChannel === 'online' 
                            ? COLORS.blue 
                            : COLORS.green 
                        },
                      ]}
                    >
                      {selectedRecord.bookingChannel === 'online' 
                        ? 'Đặt online' 
                        : 'Đặt tại phòng khám'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thanh toán:</Text>
                  <View
                    style={[
                      styles.paymentBadge,
                      { 
                        backgroundColor: PAYMENT_STATUS_CONFIG[selectedRecord.paymentStatus]?.color + '20' || COLORS.textLight + '20'
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentText,
                        { 
                          color: PAYMENT_STATUS_CONFIG[selectedRecord.paymentStatus]?.color || COLORS.textLight
                        },
                      ]}
                    >
                      {PAYMENT_STATUS_CONFIG[selectedRecord.paymentStatus]?.text || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Độ ưu tiên:</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      { 
                        backgroundColor: PRIORITY_CONFIG[selectedRecord.priority]?.color + '20' || COLORS.textLight + '20'
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        { 
                          color: PRIORITY_CONFIG[selectedRecord.priority]?.color || COLORS.textLight
                        },
                      ]}
                    >
                      {PRIORITY_CONFIG[selectedRecord.priority]?.text || 'N/A'}
                    </Text>
                  </View>
                </View>

                {selectedRecord.startedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bắt đầu:</Text>
                    <Text style={styles.detailValue}>
                      {dayjs(selectedRecord.startedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </View>
                )}

                {selectedRecord.completedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hoàn thành:</Text>
                    <Text style={styles.detailValue}>
                      {dayjs(selectedRecord.completedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </View>
                )}
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
        <Text style={styles.loadingText}>Đang tải danh sách hồ sơ...</Text>
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
        <Text style={styles.headerTitle}>Hồ sơ của tôi</Text>
        <TouchableOpacity
          onPress={() => loadRecords()}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        {/* Bộ lọc thời gian */}
        <Text style={styles.filterLabel}>Thời gian:</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.datePickerHalf}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.filterDropdownText} numberOfLines={1}>
              {startDate ? dayjs(startDate).format('DD/MM/YYYY') : 'Từ ngày'}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.datePickerHalf}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.filterDropdownText} numberOfLines={1}>
              {endDate ? dayjs(endDate).format('DD/MM/YYYY') : 'Đến ngày'}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>

          {/* Clear Date Button */}
          {(startDate || endDate) && (
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={() => {
                setStartDate(null);
                setEndDate(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}

      {/* Records List */}
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
        {records.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={styles.countText}>
              {filterRecords().length === records.length 
                ? `Tổng ${records.length} hồ sơ` 
                : `${filterRecords().length} / ${records.length} hồ sơ`}
            </Text>
            {filterRecords().map(renderRecordCard)}
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
  refreshButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  datePickerHalf: {
    flex: 1,
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
  clearDateButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  recordCard: {
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
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  cardSubValue: {
    fontSize: 12,
    color: COLORS.textLight,
    flex: 1,
    marginLeft:15
  },
  priceText: {
    color: COLORS.blue,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
    fontSize: 14,
    color: COLORS.primary,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    width: 130,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  codeValue: {
    fontFamily: 'monospace',
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  totalCostValue: {
    color: COLORS.blue,
    fontWeight: 'bold',
    fontSize: 16,
  },
  treatmentItem: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  treatmentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  usedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  usedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  treatmentAddOn: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  treatmentNotes: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  additionalServiceItem: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  additionalServiceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  additionalServiceAddOn: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  additionalServicePrice: {
    fontSize: 14,
    color: COLORS.blue,
    fontWeight: 'bold',
    marginTop: 4,
  },
  channelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCloseButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
