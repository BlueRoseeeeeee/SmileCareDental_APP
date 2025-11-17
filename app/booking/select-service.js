/**
 * @author: HoTram
 * Booking Select Service Screen - Chọn dịch vụ
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import serviceService from '../../src/services/serviceService';
import recordService from '../../src/services/recordService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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
  gold: '#faad14',
};

export default function BookingSelectServiceScreen() {
  const { user, isAuthenticated } = useAuth();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [unusedServices, setUnusedServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'exam', 'treatment'
  const [serviceSource, setServiceSource] = useState('all'); // 'all' or 'recommended'

  useEffect(() => {
    fetchServices();
    if (isAuthenticated && user && user._id) {
      fetchUnusedServices();
    }
  }, [user, isAuthenticated]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await serviceService.getAllServices();
      
      if (response.services && Array.isArray(response.services)) {
        const activeServices = response.services.filter(s => s.isActive);
        setServices(activeServices);
        applyFilters(searchValue, selectedType, serviceSource, activeServices, unusedServices);
      } else {
        Alert.alert('Lỗi', 'Không thể tải danh sách dịch vụ');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      Alert.alert('Lỗi', error.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnusedServices = async () => {
    try {
      const response = await recordService.getUnusedServices(user._id);
      
      if (response.success && response.data) {
        setUnusedServices(response.data);
        if (services.length > 0) {
          applyFilters(searchValue, selectedType, serviceSource, services, response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching unused services:', error);
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    applyFilters(value, selectedType, serviceSource, services, unusedServices);
  };

  const handleTypeChange = (value) => {
    setSelectedType(value);
    applyFilters(searchValue, value, serviceSource, services, unusedServices);
  };

  const handleSourceChange = (value) => {
    setServiceSource(value);
    applyFilters(searchValue, selectedType, value, services, unusedServices);
  };

  const applyFilters = (search, type, source, allServices, recommendedServices) => {
    let filtered = allServices;

    // Filter by source
    if (source === 'recommended' && recommendedServices.length > 0) {
      const recommendedIds = new Set(recommendedServices.map(s => s.serviceId.toString()));
      filtered = filtered.filter(service => recommendedIds.has(service._id.toString()));
    } else if (source === 'all') {
      const recommendedIds = new Set(recommendedServices.map(s => s.serviceId.toString()));
      filtered = filtered.filter(service => {
        if (recommendedIds.has(service._id.toString())) {
          return false;
        }
        return !service.requireExamFirst;
      });
    }

    // Filter by type
    if (type !== 'all') {
      filtered = filtered.filter(service => service.type === type);
    }

    // Filter by search
    if (search.trim()) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(search.toLowerCase()) ||
        service.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredServices(filtered);
  };

  const isRecommended = (serviceId) => {
    return unusedServices.some(s => s.serviceId.toString() === serviceId.toString());
  };

  const handleSelectService = async (service) => {
    // Lưu service vào AsyncStorage
    await AsyncStorage.setItem('booking_service', JSON.stringify(service));
    
    // Xóa addon cũ
    await AsyncStorage.removeItem('booking_serviceAddOn');
    await AsyncStorage.removeItem('booking_serviceAddOn_userSelected');
    
    // Nếu service có addons -> navigate đến select-addon
    // Nếu không có addons -> skip sang select-dentist
    if (service.serviceAddOns && service.serviceAddOns.length > 0) {
      router.push('/booking/select-addon');
    } else {
      router.push('/booking/select-dentist');
    }
  };

  const translateServiceType = (type) => {
    const typeMap = {
      'exam': 'Khám',
      'treatment': 'Điều trị',
    };
    return typeMap[type] || type;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn dịch vụ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Service Source Filter */}
        {unusedServices.length > 0 && (
          <View style={styles.sourceFilterContainer}>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                serviceSource === 'all' && styles.sourceButtonActive,
              ]}
              onPress={() => handleSourceChange('all')}
            >
              <Text
                style={[
                  styles.sourceButtonText,
                  serviceSource === 'all' && styles.sourceButtonTextActive,
                ]}
              >
                Dịch vụ thường
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sourceButton,
                serviceSource === 'recommended' && styles.sourceButtonActive,
              ]}
              onPress={() => handleSourceChange('recommended')}
            >
              <Ionicons name="star" size={16} color={serviceSource === 'recommended' ? COLORS.white : COLORS.gold} />
              <Text
                style={[
                  styles.sourceButtonText,
                  serviceSource === 'recommended' && styles.sourceButtonTextActive,
                ]}
              >
                Dịch vụ chỉ định ({unusedServices.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchValue}
            onChangeText={handleSearch}
            placeholder="Tìm dịch vụ theo tên"
            placeholderTextColor={COLORS.textLight}
          />
          {searchValue.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilter}>
          {[
            { label: 'Tất cả', value: 'all' },
            { label: 'Khám', value: 'exam' },
            { label: 'Điều trị', value: 'treatment' },
          ].map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.typeButton,
                selectedType === item.value && styles.typeButtonActive,
              ]}
              onPress={() => handleTypeChange(item.value)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === item.value && styles.typeButtonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>
              {searchValue ? 'Không tìm thấy dịch vụ phù hợp' : 'Chưa có dịch vụ nào'}
            </Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {filteredServices.map((service) => (
              <TouchableOpacity
                key={service._id}
                style={styles.serviceCard}
                onPress={() => handleSelectService(service)}
              >
                <View style={styles.serviceHeader}>
                 <MaterialCommunityIcons name="tooth-outline" size={24} color="black" />
                  <View style={styles.serviceTitleContainer}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.serviceTags}>
                      <View
                        style={[
                          styles.typeTag,
                          {
                            backgroundColor:
                              translateServiceType(service.type) === 'Khám'
                                ? '#e6f4ff'
                                : '#f0ffe6',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeTagText,
                            {
                              color:
                                translateServiceType(service.type) === 'Khám'
                                  ? '#1890ff'
                                  : '#52c41a',
                            },
                          ]}
                        >
                          {translateServiceType(service.type)}
                        </Text>
                      </View>
                      {isRecommended(service._id) && (
                        <View style={styles.recommendedTag}>
                          <Ionicons name="star" size={12} color={COLORS.gold} />
                          <Text style={styles.recommendedText}>Chỉ định nha sỹ</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {service.description && (
                  <Text style={styles.serviceDescription} numberOfLines={2}>
                    {service.description.replace(/<[^>]*>/g, '')}
                  </Text>
                )}
                {service.serviceAddOns && service.serviceAddOns.length > 0 && (
                  <Text style={styles.addonsCount}>
                    {service.serviceAddOns.length} gói dịch vụ có sẵn
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  sourceFilterContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  sourceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 6,
  },
  sourceButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sourceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sourceButtonTextActive: {
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  typeFilter: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
  servicesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 6,
  },
  serviceTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  recommendedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9e6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  recommendedText: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '500',
  },
  serviceDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: 8,
  },
  addonsCount: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});
