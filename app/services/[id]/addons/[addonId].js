/**
 * Service Add-On Detail Screen - Chi tiết dịch vụ con
 * File: [addonId].js (dynamic route)
 * @author: HoTram
 */

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';
import serviceService from '../../../../src/services/serviceService';

const COLORS = {
  primary: '#2596be',
  secondary: '#313b79',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
  priceGreen: '#1D7646',
};

export default function ServiceAddOnDetail() {
  const { id: serviceId, addonId } = useLocalSearchParams();
  const [addOn, setAddOn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webViewHeight, setWebViewHeight] = useState(500);
  const [youtubeVideoIds, setYoutubeVideoIds] = useState([]);

  // Extract YouTube video IDs from description and remove iframe
  const extractYoutubeIds = (htmlContent) => {
    if (!htmlContent) return [];
    
    const videoIds = [];
    // Match various YouTube URL formats including iframe src
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
      /<iframe[^>]+src=["'](?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})[^"']*["'][^>]*>/gi,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(htmlContent)) !== null) {
        if (match[1] && !videoIds.includes(match[1])) {
          videoIds.push(match[1]);
        }
      }
    });
    
    return videoIds;
  };

  // Remove YouTube iframes completely from HTML
  const removeYoutubeIframes = (htmlContent) => {
    if (!htmlContent) return '';
    
    let cleanedHtml = htmlContent;
    
    // Remove all YouTube iframes (closing tag version)
    cleanedHtml = cleanedHtml.replace(
      /<iframe[^>]+src=["'](?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/[^"']*["'][^>]*>.*?<\/iframe>/gi,
      ''
    );
    
    // Remove self-closing iframe tags
    cleanedHtml = cleanedHtml.replace(
      /<iframe[^>]+src=["'](?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/[^"']*["'][^>]*\/>/gi,
      ''
    );
    
    return cleanedHtml;
  };

  useEffect(() => {
    if (serviceId && addonId) {
      fetchAddOnDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, addonId]);

  const fetchAddOnDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceService.getServiceAddOnById(serviceId, addonId);
      
      // API trả về { addOn: {...}, service: "..." }
      if (response && response.addOn) {
        setAddOn(response.addOn);
        // Extract YouTube video IDs from description
        if (response.addOn.description) {
          const videoIds = extractYoutubeIds(response.addOn.description);
          setYoutubeVideoIds(videoIds);
        }
      } else {
        setError('Không tìm thấy thông tin dịch vụ');
      }
    } catch (error) {
      console.log('Error fetching add-on detail:', error);
      setError('Có lỗi xảy ra khi tải thông tin dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin dịch vụ...</Text>
      </View>
    );
  }

  if (error || !addOn) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.errorText}>{error || 'Không tìm thấy thông tin dịch vụ'}</Text>
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
    <SafeAreaView style={styles.container}>
      {/* Header - Fixed */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết dịch vụ</Text>
      </View>

      {/* Content Card with ScrollView */}
      <View style={styles.cardWrapper}>
        <ScrollView 
          style={styles.contentCard}
          contentContainerStyle={styles.cardContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Image */}
          {addOn.imageUrl && (
            <Image
              source={{ uri: addOn.imageUrl }}
              style={styles.addOnImage}
            />
          )}

          {/* Name */}
          <Text style={styles.addOnName}>{addOn.name}</Text>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            {/* Price */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Giá dịch vụ:</Text>
              <Text style={styles.priceValue}>
                {(addOn.effectivePrice || addOn.basePrice || 0).toLocaleString('vi-VN')} VNĐ
              </Text>
            </View>

            {/* Unit */}
            {addOn.unit && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Đơn vị:</Text>
                <Text style={styles.infoValue}>{addOn.unit}</Text>
              </View>
            )}

            {/* Duration */}
            {addOn.durationMinutes && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Thời gian:</Text>
                <Text style={styles.infoValue}>{addOn.durationMinutes} phút</Text>
              </View>
            )}

            {/* Service Type */}
            {addOn.serviceType && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Loại dịch vụ:</Text>
                <Text style={styles.infoValue}>
                  {addOn.serviceType === 'treatment' ? 'Điều trị' : addOn.serviceType === 'exam' ? 'Khám' : addOn.serviceType}
                </Text>
              </View>
            )}

            {/* Pre-exam Required */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Yêu cầu khám trước:</Text>
              <Text style={styles.infoValue}>
                {addOn.requiresPreExam ? 'Cần khám trước' : 'Không'}
              </Text>
            </View>
          </View>

          {/* YouTube Videos */}
          {youtubeVideoIds.length > 0 && (
            <View style={styles.youtubeSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIndicator} />
                <Text style={styles.sectionTitle}>Video giới thiệu</Text>
              </View>
              {youtubeVideoIds.map((videoId, index) => (
                <View key={videoId} style={styles.youtubeContainer}>
                  <YoutubePlayer
                    height={220}
                    play={false}
                    videoId={videoId}
                    webViewStyle={styles.youtubePlayer}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          {addOn.description && (
            <View style={styles.descriptionSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIndicator} />
                <Text style={styles.sectionTitle}>Mô tả dịch vụ</Text>
              </View>
              <View style={styles.descriptionWrapper}>
                <WebView
                  originWhitelist={['*']}
                  source={{
                    html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
                          <style>
                            * {
                              margin: 0;
                              padding: 0;
                              box-sizing: border-box;
                            }
                            html, body {
                              width: 100%;
                              overflow-x: hidden;
                            }
                            body {
                              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                              font-size: 15px;
                              line-height: 1.7;
                              color: #666;
                              padding: 0;
                            }
                            img {
                              max-width: 100%;
                              height: auto;
                              display: block;
                            }

                            p {
                              margin: 10px 0;
                            }
                            ul, ol {
                              padding-left: 20px;
                              margin: 10px 0;
                            }
                            li {
                              margin: 6px 0;
                            }
                            h1, h2, h3, h4, h5, h6 {
                              margin: 16px 0 8px 0;
                              color: #333;
                            }
                            strong, b {
                              font-weight: 600;
                            }
                          </style>
                          <script>
                            function sendHeight() {
                              const height = Math.max(
                                document.body.scrollHeight,
                                document.documentElement.scrollHeight,
                                document.body.offsetHeight,
                                document.documentElement.offsetHeight,
                                document.body.clientHeight,
                                document.documentElement.clientHeight
                              );
                              window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
                            }
                            
                            window.onload = function() {
                              setTimeout(sendHeight, 300);
                              setTimeout(sendHeight, 600);
                              setTimeout(sendHeight, 1000);
                            };
                            
                            // Listen for image load events
                            document.addEventListener('DOMContentLoaded', function() {
                              const images = document.getElementsByTagName('img');
                              for (let i = 0; i < images.length; i++) {
                                images[i].onload = sendHeight;
                              }
                            });
                          </script>
                        </head>
                        <body>
                          ${removeYoutubeIframes(addOn.description)}
                        </body>
                      </html>
                    `,
                  }}
                  style={{ height: webViewHeight, backgroundColor: 'transparent' }}
                  scrollEnabled={false}
                  onMessage={(event) => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      if (data.height && data.height > 100) {
                        setWebViewHeight(data.height + 20);
                      }
                    } catch (e) {
                      console.log('WebView message error:', e);
                    }
                  }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  androidLayerType="hardware"
                  allowsFullscreenVideo={true}
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback={true}
                  mixedContentMode="always"
                />
              </View>
            </View>
          )}

          {/* Room Requirements */}
          {addOn.roomRequirements && addOn.roomRequirements.length > 0 && (
            <View style={styles.infoSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIndicator} />
                <Text style={styles.sectionTitle}>Yêu cầu phòng</Text>
              </View>
              <View style={styles.tagsContainer}>
                {addOn.roomRequirements.map((room, index) => (
                  <View key={index} style={styles.tag}>
                    <Ionicons name="business" size={14} color={COLORS.primary} />
                    <Text style={styles.tagText}>{room}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Duration */}
          {addOn.estimatedDuration && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Thời gian ước tính: {addOn.estimatedDuration} phút
              </Text>
            </View>
          )}

          {/* Notes */}
          {addOn.notes && (
            <View style={styles.notesSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIndicator} />
                <Text style={styles.sectionTitle}>Ghi chú</Text>
              </View>
              <Text style={styles.notesText}>{addOn.notes}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  cardWrapper: {
    flex: 1,
    margin: 16,
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
    paddingTop: 25,
    paddingBottom: 10,
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
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 20,
    paddingBottom: 40,
  },
  addOnImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  addOnName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 16,
  },
  infoGrid: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.priceGreen,
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
    height: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  descriptionWrapper: {
    overflow: 'hidden',
  },
  youtubeSection: {
    marginBottom: 24,
  },
  youtubeContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  youtubePlayer: {
    borderRadius: 12,
  },
  infoSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e6f7ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  tagText: {
    fontSize: 13,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 8,
  },
  notesSection: {
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
