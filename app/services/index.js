/**
 * Services Screen - Danh sách dịch vụ
 * @author: HoTram
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
};

export default function ServicesScreen() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await serviceService.getServices(1, 100);
      
      if (response.success && response.services) {
        // Filter active services only
        const activeServices = response.services.filter(s => s.isActive);
        setServices(activeServices);
      }
    } catch (error) {
      console.log('Error fetching services:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleServiceClick = (service) => {
    router.push(`/services/${service._id}`);
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

  const filteredServices = services.filter(service => {
    if (!searchQuery.trim()) return true;
    const name = (service.name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query);
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách dịch vụ...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dịch vụ</Text>
        <Text style={styles.headerSubtitle}>
          Khám phá các dịch vụ nha khoa chuyên nghiệp
        </Text>
      </View>

      {/* Thanh tìm kiếm theo tên dịch vụ */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm dịch vụ..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {filteredServices.length > 0 ? (
        <View style={styles.listContainer}>
          {services.map((service) => (
            <TouchableOpacity
              key={service._id}
              style={styles.serviceCard}
              onPress={() => handleServiceClick(service)}
              activeOpacity={0.7}
            >
              {/* Service Info */}
              <View style={styles.infoContainer}>
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

                {/* Service Name */}
                <Text style={styles.serviceName} numberOfLines={2}>
                  {service.name}
                </Text>

                {/* Description */}
                {service.description && (
                  <Text style={styles.serviceDescription} numberOfLines={2}>
                    {service.description}
                  </Text>
                )}

                {/* AddOns Count */}
                {service.serviceAddOns && service.serviceAddOns.length > 0 && (
                  <View style={styles.addOnsInfo}>
                    <Ionicons name="list-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.addOnsText}>
                      {service.serviceAddOns.filter(a => a.isActive).length} tùy chọn
                    </Text>
                  </View>
                )}

                {/* View Button */}
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>Xem chi tiết</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name={searchQuery ? "search-outline" : "medkit-outline"} size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Không tìm thấy dịch vụ phù hợp' : 'Chưa có dịch vụ nào'}
          </Text>
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
  header: {
    backgroundColor: COLORS.white,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    padding: 0,
  },
  listContainer: {
    padding: 16,
  },
  serviceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoContainer: {
    flex: 1,
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
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  addOnsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addOnsText: {
    fontSize: 13,
    color: COLORS.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#e6f7ff',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 6,
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
