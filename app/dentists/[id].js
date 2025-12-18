/**
 * Dentist Detail Screen - Chi tiết nha sĩ
 * File: [id].js (dynamic route - keep filename for expo-router)
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
import { WebView } from 'react-native-webview';
import userService from '../../src/services/userService';

const COLORS = {
  primary: '#2596be',
  secondary: '#313b79',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
};

export default function DentistDetail() {
  const { id } = useLocalSearchParams();
  const [dentist, setDentist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchDentistDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchDentistDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getUserById(id);
      
      if (response.success && response.user) {
        setDentist(response.user);
      } else {
        setError('Không tìm thấy thông tin nha sĩ');
      }
    } catch (error) {
      console.log('Error fetching dentist detail:', error);
      setError('Có lỗi xảy ra khi tải thông tin nha sĩ');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin nha sĩ...</Text>
      </View>
    );
  }

  if (error || !dentist) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.errorText}>{error || 'Không tìm thấy thông tin nha sĩ'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết nha sĩ</Text>
      </View>

      {/* Dentist Info Card */}
      <View style={styles.infoCard}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          {dentist.avatar ? (
            <Image
              source={{ uri: dentist.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Image source={require('../../assets/smileCare_img/smile-dental-logo.png')}/>
            </View>
          )}
        </View>

        {/* Name */}
        <View style={styles.nameSection}>
          <Text style={styles.dentistName}>
            Nha sĩ. {dentist.fullName || dentist.name}
          </Text>
        </View>

        {/* Description */}
        {dentist.description && (
          <View style={styles.descriptionSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>Giới thiệu</Text>
            </View>
            <WebView
              originWhitelist={['*']}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                      <style>
                        body {
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                          font-size: 15px;
                          line-height: 1.6;
                          color: #666;
                          padding: 12px;
                          margin: 0;
                        }
                        * {
                          max-width: 100%;
                        }
                        img {
                          height: auto;
                        }
                        p {
                          margin: 8px 0;
                        }
                        ul, ol {
                          padding-left: 20px;
                          margin: 8px 0;
                        }
                        li {
                          margin: 4px 0;
                        }
                      </style>
                    </head>
                    <body>
                      ${dentist.description}
                    </body>
                  </html>
                `,
              }}
              style={styles.webView}
              scrollEnabled={false}
              onMessage={(event) => {}}
              injectedJavaScript={`
                const height = document.documentElement.scrollHeight;
                window.ReactNativeWebView.postMessage(height);
              `}
            />
          </View>
        )}

        {/* Certificates */}
        {dentist.certificates && dentist.certificates.length > 0 && (
          <View style={styles.certificatesSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>Bằng cấp và Chứng chỉ</Text>
            </View>

            {dentist.certificates.map((cert, index) => (
              <View key={cert._id || index} style={styles.certificateItem}>
                <View style={styles.certificateHeader}>
                  <View style={styles.certificateBullet} />
                  <Text style={styles.certificateName}>{cert.name}</Text>
                </View>

                {/* Certificate Images */}
                <View style={styles.certificateImages}>
                  {cert.frontImage && (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: cert.frontImage }}
                        style={styles.certificateImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  {cert.backImage && (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: cert.backImage }}
                        style={styles.certificateImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 200,
    height: 200,
    objectFit: 'contain',
    borderColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: {
    marginBottom: 24,
  },
  dentistName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIndicator: {
    width: 4,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  webView: {
    backgroundColor: 'transparent',
    height: 400,
  },
  certificatesSection: {
    marginTop: 8,
  },
  certificateItem: {
    marginBottom: 32,
  },
  certificateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  certificateBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginRight: 8,
  },
  certificateName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
    flex: 1,
  },
  certificateImages: {
    gap: 16,
  },
  imageContainer: {
    marginBottom: 8,
  },
  certificateImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  imageLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});
