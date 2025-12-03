/**
 * AI Chat Assistant
 * @author: HoTram
 */

import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import chatbotService from '../services/chatbotService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  userBubble: '#52c41a',
  assistantBubble: '#f0f0f0',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const scrollViewRef = useRef(null);

  // Draggable position
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - 80, y: SCREEN_HEIGHT - 180 })).current;

  // Create PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        
        // Check if it was a tap (small movement) or drag
        const isTap = Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10;
        
        if (isTap) {
          setIsOpen(true);
        } else {
          // Snap to nearest edge or keep within bounds
          let finalX = pan.x._value;
          let finalY = pan.y._value;

          // Keep within screen bounds (with padding)
          const minX = 0;
          const maxX = SCREEN_WIDTH - 60;
          const minY = 50;
          const maxY = SCREEN_HEIGHT - 150;

          if (finalX < minX) finalX = minX;
          if (finalX > maxX) finalX = maxX;
          if (finalY < minY) finalY = minY;
          if (finalY > maxY) finalY = maxY;

          Animated.spring(pan, {
            toValue: { x: finalX, y: finalY },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto scroll to bottom when new message
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, typing]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await chatbotService.getHistory(100);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;

    const userMessage = {
      role: 'user',
      content: inputMessage || (selectedImage ? '📷 [Đã gửi ảnh]' : ''),
      timestamp: new Date(),
      imagePreview: imagePreview, // Store image preview for display
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setTyping(true);

    try {
      const response = await chatbotService.sendMessage(inputMessage, selectedImage);
      
      setTyping(false);

      if (response.success) {
        // Handle image analysis response
        if (response.analysis) {
          const assistantMessage = {
            role: 'assistant',
            content: response.analysis,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } 
        // Handle regular chat response
        else if (response.response) {
          const assistantMessage = {
            role: 'assistant',
            content: response.response,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }

        // Check if response contains booking data for payment redirect
        if (response.redirectToPayment && response.bookingData) {
          
          Alert.alert(
            'Đặt lịch thành công',
            'Bạn muốn chuyển đến trang thanh toán không?',
            [
              {
                text: 'Để sau',
                style: 'cancel',
              },
              {
                text: 'Thanh toán ngay',
                onPress: () => {
                  // TODO: Navigate to booking/payment screen
                  // Store booking data in AsyncStorage (similar to web localStorage)
                  AsyncStorage.multiSet([
                    ['booking_service', JSON.stringify(response.bookingData.service)],
                    ['booking_serviceAddOn', JSON.stringify(response.bookingData.serviceAddOn)],
                    ['booking_dentist', JSON.stringify(response.bookingData.dentist)],
                    ['booking_date', response.bookingData.date],
                    ['booking_slotGroup', JSON.stringify(response.bookingData.slotGroup)],
                  ]).then(() => {
                    // Navigate to CreateAppointment screen
                    // navigation.navigate('CreateAppointment'); // Uncomment when navigation is available
                    Alert.alert('Thông báo', 'Chức năng đang phát triển. Vui lòng đặt lịch qua trang chính.');
                  });
                },
              },
            ]
          );
        }
      } else {
        // Handle non-teeth image or other errors
        if (response.isTeethImage === false) {
          const errorMessage = {
            role: 'assistant',
            content: response.message || 'Ảnh bạn gửi không phải là hình răng/miệng. Vui lòng gửi lại ảnh răng để tôi có thể tư vấn chính xác hơn. 🦷',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        } else {
          throw new Error(response.message || 'Failed to get response');
        }
      }
    } catch (error) {
      setTyping(false);
      Alert.alert('Κỗi', 'Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.');
      
      // Remove user message if failed
      setMessages((prev) => prev.filter((m) => m !== userMessage));
    } finally {
      // Clear image selection
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Xóa lịch sử chat',
      'Bạn có chắc muốn xóa toàn bộ lịch sử chat?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatbotService.clearHistory();
              setMessages([]);
              Alert.alert('Thành công', 'Đã xóa lịch sử chat');
            } catch (error) {
              Alert.alert('Κỗi', 'Không thể xóa lịch sử chat');
            }
          },
        },
      ]
    );
  };

  const handleSelectImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Get proper MIME type from URI extension
        const getMimeType = (uri) => {
          if (uri.endsWith('.png')) return 'image/png';
          if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) return 'image/jpeg';
          if (uri.endsWith('.gif')) return 'image/gif';
          return 'image/jpeg'; // default
        };
        
        setImagePreview(asset.uri);
        setSelectedImage({
          uri: asset.uri,
          type: getMimeType(asset.uri),
          fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền sử dụng camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        setImagePreview(asset.uri);
        setSelectedImage({
          uri: asset.uri,
          type: 'image/jpeg',
          fileName: `photo-${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
  };

  const handleImageOptions = () => {
    Alert.alert('Chọn ảnh', 'Bạn muốn chọn ảnh từ đâu?', [
      {
        text: 'Thư viện',
        onPress: handleSelectImage,
      },
      {
        text: 'Chụp ảnh',
        onPress: handleTakePhoto,
      },
      {
        text: 'Hủy',
        style: 'cancel',
      },
    ]);
  };

  const handleConfirmSendImage = async () => {
    // Use handleSendMessage instead (unified logic)
    await handleSendMessage();
  };

  const handleRemovePreview = () => {
    setImagePreview(null);
    setSelectedImage(null);
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';

    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.white} />
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {msg.imagePreview && (
            <TouchableOpacity
              onPress={() => {
                setPreviewImageUri(msg.imagePreview);
                setPreviewModalVisible(true);
              }}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: msg.imagePreview }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {/* Parse Markdown links [text](url) into clickable text */}
            {msg.content.split(/(\[.+?\]\(.+?\))/).map((part, i) => {
              const linkMatch = part.match(/\[(.+?)\]\((.+?)\)/);
              if (linkMatch) {
                return (
                  <Text
                    key={i}
                    style={{ color: isUser ? '#fff' : '#1890ff', textDecorationLine: 'underline', fontWeight: 'bold' }}
                    onPress={() => {
                      // Open link in browser or handle navigation
                      Alert.alert('Link', `Mở link: ${linkMatch[2]}`);
                    }}
                  >
                    {linkMatch[1]}
                  </Text>
                );
              }
              return <Text key={i}>{part}</Text>;
            })}
          </Text>
          {msg.suggestions && msg.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>💡 Gợi ý dịch vụ:</Text>
              {msg.suggestions.map((suggestion, idx) => (
                <Text key={idx} style={styles.suggestionItem}>
                  • {suggestion}
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.messageTime}>
            {dayjs(msg.timestamp).format('HH:mm')}
          </Text>
        </View>

        {isUser && (
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={20} color={COLORS.white} />
          </View>
        )}
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.assistantMessage]}>
      <View style={styles.assistantAvatar}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.white} />
      </View>
      <View style={[styles.messageBubble, styles.assistantBubble]}>
        <View style={styles.typingIndicator}>
          <View style={[styles.typingDot, styles.dot1]} />
          <View style={[styles.typingDot, styles.dot2]} />
          <View style={[styles.typingDot, styles.dot3]} />
        </View>
      </View>
    </View>
  );

  const renderWelcomeScreen = () => (
    <View style={styles.welcomeContainer}>
      <Image source={require('../../assets/icon/robot-tuvan-dethuong.png')} style={{width:250, height:210}}/>
      <Text style={styles.welcomeTitle}>Chào bạn! 👋</Text>
      <Text style={styles.welcomeText}>
        Tôi là SmileCare AI, trợ lý ảo của phòng khám nha khoa SmileCare.
      </Text>
      <Text style={styles.welcomeSubtitle}>Bạn có thể hỏi tôi về:</Text>
      <View style={styles.featureList}>
        <Text style={styles.featureItem}>• Dịch vụ nha khoa</Text>
        <Text style={styles.featureItem}>• Giá cả và chi phí</Text>
        <Text style={styles.featureItem}>• Đặt lịch khám</Text>
        <Text style={styles.featureItem}>• Tư vấn răng miệng</Text>
        <Text style={styles.featureItem}>• Phân tích ảnh răng</Text>
      </View>
    </View>
  );

  if (!isOpen) {
    return (
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="chatbubble-ellipses" size={28} color={COLORS.white} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsOpen(false)}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Image source={require('../../assets/icon/robot_cute.png')} style={{width:60, height:60}}/>
            </View>
            <View>
              <Text style={styles.headerTitle}>SmileCare AI</Text>
              <Text style={styles.headerSubtitle}>Trợ lý ảo nha khoa</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleClearHistory}
              style={styles.headerButton}
            >
              <Ionicons name="trash-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              style={styles.headerButton}
            >
              <Ionicons name="close" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
            </View>
          ) : messages.length === 0 ? (
            renderWelcomeScreen()
          ) : (
            <>
              {messages.map(renderMessage)}
              {typing && renderTypingIndicator()}
            </>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          {/* Image Preview - Display above input if selected */}
          {imagePreview && (
            <View style={styles.imagePreviewBar}>
              <Image
                source={{ uri: imagePreview }}
                style={styles.previewThumbnail}
                resizeMode="cover"
              />
              <Text style={styles.previewFileName} numberOfLines={1}>
                {selectedImage?.fileName || 'image.jpg'}
              </Text>
              <TouchableOpacity onPress={handleRemovePreview} style={styles.removePreviewButton}>
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handleImageOptions}
              disabled={loading || typing}
            >
              <Ionicons
                name="image-outline"
                size={24}
                color={selectedImage ? COLORS.blue : (loading || typing ? COLORS.border : COLORS.primary)}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder={selectedImage ? "Mô tả thêm về ảnh (tùy chọn)..." : "Nhập câu hỏi..."}
              placeholderTextColor={COLORS.textLight}
              multiline
              maxLength={500}
              editable={!loading && !typing}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!inputMessage.trim() && !selectedImage) || loading || typing) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={(!inputMessage.trim() && !selectedImage) || loading || typing}
            >
              <Ionicons name="send" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* modal hiển thị preview hình ảnh */}
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.previewModalOverlay}
          activeOpacity={1}
          onPress={() => setPreviewModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.previewModalClose}
            onPress={() => setPreviewModalVisible(false)}
            activeOpacity={0.9}
          >
            <Ionicons name="close-circle" size={40} color={COLORS.white} />
          </TouchableOpacity>
          
          <Image
            source={{ uri: previewImageUri }}
            style={styles.previewModalImage}
            resizeMode="contain"
          />
          
          <Text style={styles.previewModalHint}>
            Nhấn để đóng
          </Text>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  buttonContent: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 16,
    backgroundColor: COLORS.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  messagesContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  featureList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 12,
    padding: 12,
  },
  userBubble: {
    backgroundColor: COLORS.userBubble,
  },
  assistantBubble: {
    backgroundColor: COLORS.assistantBubble,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: COLORS.white,
  },
  assistantText: {
    color: COLORS.text,
  },
  suggestionsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  suggestionItem: {
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 8,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textLight,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  inputContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  previewThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewFileName: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight,
  },
  removePreviewButton: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
  },
  imageButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  previewModalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  previewModalHint: {
    position: 'absolute',
    bottom: 50,
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.7,
  },
});
