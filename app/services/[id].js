/**
 * Service Add-Ons Screen - Danh sách dịch vụ con
 * File: [id].js (dynamic route for serviceId)
 * @author: HoTram
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import serviceService from '../../src/services/serviceService';

const COLORS = {
  primary: '#2596be',
  secondary: '#313b79',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
  exam: '#1890ff',
  treatment: '#52c41a',
  priceGreen: '#1D7646',
};

export default function ServiceAddOnsScreen() {
  const { id } = useLocalSearchParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchServiceDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceService.getServiceById(id);
      
      if (response.success && response.data) {
        setService(response.data);
      } else {
        setError('Không tìm thấy dịch vụ');
      }
    } catch (error) {
      console.log('Error fetching service details:', error);
      setError('Có lỗi xảy ra khi tải dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  const translateServiceType = (type) => {
    const typeMap = {
      'treatment': 'Điều trị',
      'exam': 'Khám',
    };
    return typeMap[type] || type;
  };

  const getServiceTypeColor = (type) => {
    return type === 'exam' ? COLORS.exam : COLORS.treatment;
  };

  const handleAddOnClick = (addOn) => {
    router.push(`/services/${id}/addons/${addOn._id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin dịch vụ...</Text>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.errorText}>{error || 'Không tìm thấy dịch vụ'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeAddOns = service.serviceAddOns?.filter(addon => addon.isActive) || [];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {service.name}
        </Text>
      </View>

      {/* Service Info Card */}
      {service.description && (
        <View style={styles.serviceInfoCard}>
          <Text style={styles.serviceDescription}>
            {service.description}
          </Text>
        </View>
      )}

      {/* Add-Ons List */}
      {activeAddOns.length > 0 ? (
        <View style={styles.addOnsContainer}>
          <Text style={styles.sectionTitle}>Tùy chọn dịch vụ</Text>
          
          {activeAddOns.map((addOn) => (
            <TouchableOpacity
              key={addOn._id}
              style={styles.addOnCard}
              onPress={() => handleAddOnClick(addOn)}
              activeOpacity={0.7}
            >
              {/* Image */}
              <View style={styles.addOnImageContainer}>
                {addOn.imageUrl ? (
                  <Image
                    source={{ uri: addOn.imageUrl }}
                    style={styles.addOnImage}
                  />
                ) : (
                  <View style={styles.addOnImagePlaceholder}>
                    <Ionicons name="medical" size={32} color={COLORS.textLight} />
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.addOnInfo}>
                {/* Type Badge */}
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: getServiceTypeColor(service.type) + '20' }
                ]}>
                  <Text style={[
                    styles.typeBadgeText,
                    { color: getServiceTypeColor(service.type) }
                  ]}>
                    {translateServiceType(service.type)}
                  </Text>
                </View>

                <Text style={styles.addOnName} numberOfLines={2}>
                  {addOn.name}
                </Text>

                {/* Price */}
                <Text style={styles.addOnPrice}>
                  {(addOn.effectivePrice || addOn.basePrice || 0).toLocaleString('vi-VN')} VNĐ
                </Text>

                {/* View Button */}
                <View style={styles.viewDetailTag}>
                  <Text style={styles.viewDetailText}>Xem chi tiết</Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Chưa có tùy chọn dịch vụ</Text>
        </View>
      )}
    </ScrollView>
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
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backIconButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  serviceInfoCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  addOnsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  addOnCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addOnImageContainer: {
    width: 120,
    height: 150,
    backgroundColor: COLORS.background,
  },
  addOnImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  addOnImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOnInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  addOnName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  addOnPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.priceGreen,
    marginBottom: 8,
  },
  viewDetailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#e6f7ff',
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
});
