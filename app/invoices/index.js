/**
 * Invoices Screen - Hóa đơn của tôi
 * @author: HoTram
 * Logic: Hiển thị danh sách hóa đơn, filter, xem chi tiết, download PDF
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
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
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import invoiceService from '../../src/services/invoiceService';

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
  purple: '#722ed1',
  magenta: '#eb2f96',
  processing: '#1890ff',
};

const STATUS_CONFIG = {
  draft: { color: COLORS.textLight, text: 'Nháp', icon: 'document-outline' },
  pending: { color: COLORS.warning, text: 'Chờ thanh toán', icon: 'time-outline' },
  paid: { color: COLORS.success, text: 'Đã thanh toán', icon: 'checkmark-circle-outline' },
  partial_paid: { color: COLORS.processing, text: 'Thanh toán 1 phần', icon: 'pie-chart-outline' },
  overdue: { color: COLORS.error, text: 'Quá hạn', icon: 'alert-circle-outline' },
  cancelled: { color: COLORS.textLight, text: 'Đã hủy', icon: 'close-circle-outline' },
  refunded: { color: COLORS.purple, text: 'Đã hoàn tiền', icon: 'arrow-undo-outline' },
};

const PAYMENT_METHOD_CONFIG = {
  cash: { color: COLORS.green, text: 'Tiền mặt', icon: 'cash-outline' },
  bank_transfer: { color: COLORS.blue, text: 'Chuyển khoản', icon: 'business-outline' },
  credit_card: { color: COLORS.purple, text: 'Thẻ tín dụng', icon: 'card-outline' },
  vnpay: { color: COLORS.cyan, text: 'VNPay', icon: 'wallet-outline' },
  momo: { color: COLORS.magenta, text: 'Momo', icon: 'wallet-outline' },
};

const TYPE_MAP = {
  appointment: 'Cuộc hẹn',
  treatment: 'Điều trị',
  consultation: 'Tư vấn',
  emergency: 'Cấp cứu',
  checkup: 'Kiểm tra',
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'partial_paid', label: 'Thanh toán 1 phần' },
  { value: 'overdue', label: 'Quá hạn' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export default function InvoicesScreen() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    if (user?._id) {
      loadInvoices();
    }
  }, [user?._id]);

  useEffect(() => {
    filterInvoices();
  }, [selectedFilter, startDate, endDate, invoices]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoiceService.getMyInvoices({
        page: 1,
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (response.success && response.data) {
        const invoiceList = response.data.invoices || response.data || [];
        setInvoices(invoiceList);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('❌ Load invoices error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách hóa đơn');
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInvoices();
  }, []);

  const filterInvoices = () => {
    let filtered = [...invoices];

    // Filter những hóa đơn của user hiện tại. lọc ở FE luôn, không dùng API
    if (user?._id) {
      filtered = filtered.filter(inv => 
        inv.patientId === user._id || inv.patientId?._id === user._id
      );
    }

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === selectedFilter);
    }

    // Filter by date range 
    if (startDate && endDate) {
      filtered = filtered.filter((inv) => {
        const invDate = dayjs(inv.createdAt);
        return invDate.isSameOrAfter(dayjs(startDate), 'day') && 
               invDate.isSameOrBefore(dayjs(endDate), 'day');
      });
    } else if (startDate) {
      filtered = filtered.filter((inv) => {
        const invDate = dayjs(inv.createdAt);
        return invDate.isSameOrAfter(dayjs(startDate), 'day');
      });
    } else if (endDate) {
      filtered = filtered.filter((inv) => {
        const invDate = dayjs(inv.createdAt);
        return invDate.isSameOrBefore(dayjs(endDate), 'day');
      });
    }

    setFilteredInvoices(filtered);
  };

  const handleViewDetail = async (invoice) => {
    try {
      setLoading(true);
      const response = await invoiceService.getInvoiceById(invoice._id);

      if (response.success && response.data) {
        setSelectedInvoice(response.data);
        setDetailModalVisible(true);
      }
    } catch (error) {
      console.error('❌ Get invoice detail error:', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId) => {
    Alert.alert(
      'Tải PDF',
      'Chức năng tải PDF sẽ được hỗ trợ trong phiên bản tiếp theo',
      [{ text: 'OK' }]
    );
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

  const renderPaymentMethodBadge = (method) => {
    if (!method) {
      return (
        <View style={[styles.badge, { backgroundColor: COLORS.textLight + '20' }]}>
          <Text style={[styles.badgeText, { color: COLORS.textLight }]}>N/A</Text>
        </View>
      );
    }

    const config = PAYMENT_METHOD_CONFIG[method.toLowerCase()] || {
      color: COLORS.textLight,
      text: method,
      icon: 'card-outline',
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

  const renderInvoiceCard = (invoice) => {
    return (
      <TouchableOpacity
        key={invoice._id}
        style={styles.invoiceCard}
        onPress={() => handleViewDetail(invoice)}
        activeOpacity={0.7}
      >
        {/* Header - Invoice Number & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.invoiceNumberContainer}>
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
            <Text style={styles.invoiceNumber}>
              {invoice.invoiceNumber || 'N/A'}
            </Text>
          </View>
          {renderStatusBadge(invoice.status)}
        </View>

        {/* Date & Type */}
        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.cardLabel}>Ngày tạo:</Text>
          <Text style={styles.cardValue}>
            {dayjs(invoice.createdAt).format('DD/MM/YYYY')}
          </Text>
        </View>

        <View style={styles.cardRow}>
          <Ionicons name="pricetag-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.cardLabel}>Loại:</Text>
          <Text style={styles.cardValue}>
            {TYPE_MAP[invoice.type] || invoice.type}
          </Text>
        </View>

        {/* Total Amount */}
        <View style={styles.cardRow}>
          <Ionicons name="cash-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.cardLabel}>Tổng tiền:</Text>
          <Text style={[styles.cardValue, styles.totalAmount]}>
            {(invoice.totalAmount || 0).toLocaleString('vi-VN')} đ
          </Text>
        </View>

        {/* Payment Method */}
        <View style={styles.cardRow}>
          <Ionicons name="wallet-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.cardLabel}>Phương thức:</Text>
          {renderPaymentMethodBadge(invoice.paymentSummary?.paymentMethod)}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => handleViewDetail(invoice)}
          >
            <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
              Chi tiết
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={() => handleDownloadPDF(invoice._id)}
          >
            <Ionicons name="download-outline" size={18} color={COLORS.blue} />
            <Text style={[styles.actionButtonText, { color: COLORS.blue }]}>
              PDF
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color={COLORS.border} />
      <Text style={styles.emptyTitle}>Chưa có hóa đơn nào</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all'
          ? 'Bạn chưa có hóa đơn nào'
          : `Không có hóa đơn "${FILTER_OPTIONS.find(f => f.value === selectedFilter)?.label}"`}
      </Text>
    </View>
  );

  const renderDetailModal = () => {
    if (!selectedInvoice) return null;

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
                <Text style={styles.modalTitle}>Chi tiết hóa đơn</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Basic Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã hóa đơn:</Text>
                  <Text style={[styles.detailValue, styles.invoiceCode]}>
                    {selectedInvoice.invoiceNumber || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ngày tạo:</Text>
                  <Text style={styles.detailValue}>
                    {dayjs(selectedInvoice.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </View>
                {selectedInvoice.dueDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hạn thanh toán:</Text>
                    <Text style={styles.detailValue}>
                      {dayjs(selectedInvoice.dueDate).format('DD/MM/YYYY')}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Loại:</Text>
                  <Text style={styles.detailValue}>
                    {TYPE_MAP[selectedInvoice.type] || selectedInvoice.type}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Trạng thái:</Text>
                  {renderStatusBadge(selectedInvoice.status)}
                </View>
              </View>

              {/* Patient Info */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thông tin bệnh nhân</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Họ tên:</Text>
                  <Text style={styles.detailValue}>
                    {selectedInvoice.patientInfo?.name || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Điện thoại:</Text>
                  <Text style={styles.detailValue}>
                    {selectedInvoice.patientInfo?.phone || 'N/A'}
                  </Text>
                </View>
                {selectedInvoice.patientInfo?.email && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>
                      {selectedInvoice.patientInfo.email}
                    </Text>
                  </View>
                )}
              </View>

              {/* Dentist Info */}
              {selectedInvoice.dentistInfo?.name && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Nha sĩ điều trị</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tên nha sĩ:</Text>
                    <Text style={styles.detailValue}>
                      {selectedInvoice.dentistInfo.name}
                    </Text>
                  </View>
                </View>
              )}

              {/* Invoice Details */}
              {selectedInvoice.details && selectedInvoice.details.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Chi tiết dịch vụ</Text>
                  {selectedInvoice.details.map((item, index) => (
                    <View key={item._id || index} style={styles.serviceItem}>
                      <View style={styles.serviceHeader}>
                        <Text style={styles.serviceName}>
                          {item.serviceInfo?.name || item.description || 'N/A'}
                        </Text>
                        <Text style={styles.serviceQuantity}>x{item.quantity}</Text>
                      </View>
                      {item.notes && (
                        <Text style={styles.serviceNotes}>{item.notes}</Text>
                      )}
                      <View style={styles.servicePricing}>
                        <Text style={styles.serviceLabel}>Đơn giá:</Text>
                        <Text style={styles.servicePrice}>
                          {(item.unitPrice || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                      {item.discountAmount > 0 && (
                        <View style={styles.servicePricing}>
                          <Text style={styles.serviceLabel}>Giảm giá:</Text>
                          <Text style={styles.serviceDiscount}>
                            -{item.discountAmount.toLocaleString('vi-VN')} đ
                          </Text>
                        </View>
                      )}
                      <View style={styles.servicePricing}>
                        <Text style={styles.serviceLabelBold}>Thành tiền:</Text>
                        <Text style={styles.serviceTotalPrice}>
                          {(item.totalPrice || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Payment Summary */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Thanh toán</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tạm tính:</Text>
                  <Text style={styles.summaryValue}>
                    {(selectedInvoice.subtotal || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                {selectedInvoice.discountInfo && selectedInvoice.discountInfo.value > 0 && (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Giảm giá:</Text>
                      <Text style={styles.summaryDiscount}>
                        -{selectedInvoice.discountInfo.type === 'percentage'
                          ? `${selectedInvoice.discountInfo.value}%`
                          : `${selectedInvoice.discountInfo.value.toLocaleString('vi-VN')} đ`}
                      </Text>
                    </View>
                    {selectedInvoice.discountInfo.reason && (
                      <Text style={styles.discountReason}>
                        Lý do: {selectedInvoice.discountInfo.reason}
                      </Text>
                    )}
                  </>
                )}

                {selectedInvoice.taxInfo && selectedInvoice.taxInfo.taxAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Thuế ({selectedInvoice.taxInfo.taxRate}%):
                    </Text>
                    <Text style={styles.summaryValue}>
                      {selectedInvoice.taxInfo.taxAmount.toLocaleString('vi-VN')} đ
                    </Text>
                  </View>
                )}

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelBold}>Tổng cộng:</Text>
                  <Text style={styles.summaryTotal}>
                    {(selectedInvoice.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Đã thanh toán:</Text>
                  <Text style={styles.summaryPaid}>
                    {(selectedInvoice.paymentSummary?.totalPaid || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelBold}>Còn lại:</Text>
                  <Text
                    style={[
                      styles.summaryRemaining,
                      {
                        color:
                          (selectedInvoice.paymentSummary?.remainingAmount || 0) > 0
                            ? COLORS.error
                            : COLORS.success,
                      },
                    ]}
                  >
                    {(selectedInvoice.paymentSummary?.remainingAmount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phương thức:</Text>
                  {renderPaymentMethodBadge(selectedInvoice.paymentSummary?.paymentMethod)}
                </View>

                {selectedInvoice.paymentSummary?.lastPaymentDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Thanh toán cuối:</Text>
                    <Text style={styles.detailValue}>
                      {dayjs(selectedInvoice.paymentSummary.lastPaymentDate).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </View>
                )}

                {selectedInvoice.issueDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ngày xuất:</Text>
                    <Text style={styles.detailValue}>
                      {dayjs(selectedInvoice.issueDate).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </View>
                )}

                {selectedInvoice.paidDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ngày thanh toán:</Text>
                    <Text style={styles.detailValue}>
                      {dayjs(selectedInvoice.paidDate).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Notes */}
              {selectedInvoice.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Ghi chú</Text>
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{selectedInvoice.notes}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalDownloadButton}
                onPress={() => handleDownloadPDF(selectedInvoice._id)}
              >
                <Ionicons name="download-outline" size={20} color={COLORS.white} />
                <Text style={styles.modalDownloadButtonText}>Tải PDF</Text>
              </TouchableOpacity>
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

  if (loading && invoices.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách hóa đơn...</Text>
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
        <Text style={styles.headerTitle}>Hóa đơn của tôi</Text>
        <TouchableOpacity onPress={() => loadInvoices()} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        {/* Status Filter Row */}
        <Text style={styles.filterLabel}>Trạng thái:</Text>
        <TouchableOpacity
          style={styles.filterDropdownFull}
          onPress={() => setFilterDropdownVisible(!filterDropdownVisible)}
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

        {/* Date Range Filter Row */}
        <Text style={[styles.filterLabel, { marginTop: 12 }]}>Thời gian:</Text>
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
          <View style={[styles.dropdownMenuModal, { top: 170, left: 16, right: 16 }]}>
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

      {/* Start Date Picker */}
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

      {/* End Date Picker */}
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

      {/* Invoices List */}
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
        {filteredInvoices.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <Text style={styles.countText}>
              Tổng {filteredInvoices.length} hóa đơn
            </Text>
            {filteredInvoices.map(renderInvoiceCard)}
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
  filterDropdownFull: {
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
  invoiceCard: {
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
  invoiceNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceNumber: {
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
  totalAmount: {
    color: COLORS.blue,
    fontWeight: 'bold',
    fontSize: 14,
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
  downloadButton: {
    backgroundColor: COLORS.blue + '15',
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
  invoiceCode: {
    fontFamily: 'monospace',
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  serviceItem: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  serviceQuantity: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  serviceNotes: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  servicePricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  serviceLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  serviceLabelBold: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  servicePrice: {
    fontSize: 13,
    color: COLORS.text,
  },
  serviceDiscount: {
    fontSize: 13,
    color: COLORS.error,
  },
  serviceTotalPrice: {
    fontSize: 13,
    color: COLORS.blue,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryLabelBold: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  summaryDiscount: {
    fontSize: 14,
    color: COLORS.error,
  },
  discountReason: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 16,
    color: COLORS.blue,
    fontWeight: 'bold',
  },
  summaryPaid: {
    fontSize: 14,
    color: COLORS.success,
  },
  summaryRemaining: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesBox: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalDownloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  modalDownloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
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
});
