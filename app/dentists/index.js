/**
 * Dentists List Screen - Danh sách nha sĩ
 * @author: HoTram
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { decode } from 'he';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import userService from '../../src/services/userService';

const COLORS = {
  primary: '#2596be',
  secondary: '#313b79',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
  gold: '#ffd700',
};

export default function DentistsScreen() {
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDentists();
  }, []);

  const fetchDentists = async () => {
    try {
      setLoading(true);
      const response = await userService.getPublicDentists();
      
      if (response.success && response.dentists) {
        setDentists(response.dentists);
      }
    } catch (error) {
      console.log('Error fetching dentists:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDentists();
  };

  const handleViewDetail = (dentist) => {
    const dentistId = dentist._id || dentist.id;
    router.push(`/dentists/${dentistId}`);
  };

  const stripHtml = (html) => {
    if (!html) return '';
    // Loại bỏ các thẻ HTML
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    // Decode HTML entities bằng thư viện he
    const decoded = decode(withoutTags);
    // Chuẩn hóa khoảng trắng
    return decoded.replace(/\s+/g, ' ').trim();
  };

  const filteredDentists = dentists.filter(dentist => {
    if (!searchQuery.trim()) return true;
    const name = (dentist.name || dentist.fullName || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query);
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải danh sách nha sĩ...</Text>
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
        <Text style={styles.headerTitle}>Đội ngũ nha sĩ</Text>
        <Text style={styles.headerSubtitle}>
          Đội ngũ nha sĩ tài giỏi giàu kinh nghiệm
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm nha sĩ..."
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

      {filteredDentists.length > 0 ? (
        <View style={styles.listContainer}>
          {filteredDentists.map((dentist) => (
            <View key={dentist._id || dentist.id} style={styles.dentistCard}>
              {/* Avatar */}
              <View style={styles.avatarSection}>
                {dentist.avatar ? (
                  <Image
                    source={{ uri: dentist.avatar }}
                    style={styles.cardAvatar}
                  />
                ) : (
                  <View style={styles.cardAvatarPlaceholder}>
                    <Ionicons name="person" size={60} color={COLORS.white} />
                  </View>
                )}
              </View>

              {/* Info Section */}
              <View style={styles.infoSection}>
                <Text style={styles.dentistTitle}>
                  NS. {dentist.name||dentist.fullName}
                </Text>
                
                {/* Description Preview */}
                {dentist.description && (
                  <View style={styles.descriptionPreview}>
                    <Text style={styles.descriptionText} numberOfLines={5}>
                      {stripHtml(dentist.description)}
                    </Text>
                  </View>
                )}

                {/* View Detail Button */}
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => handleViewDetail(dentist)}
                >
                  <Text style={styles.detailButtonText}>Xem chi tiết</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name={searchQuery ? "search-outline" : "people-outline"} size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Không tìm thấy nha sĩ phù hợp' : 'Chưa có thông tin nha sĩ'}
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
    paddingTop: 25,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
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
  dentistCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarSection: {
    marginRight: 16,
  },
  cardAvatar: {
    width: 120,
    height: 140,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  cardAvatarPlaceholder: {
    width: 120,
    height: 140,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'space-between',
  },
  dentistTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  descriptionPreview: {
    flex: 1,
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#e6f7ff',
  },
  detailButtonText: {
    fontSize: 13,
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
