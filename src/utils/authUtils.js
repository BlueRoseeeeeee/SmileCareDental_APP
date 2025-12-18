/**
 * Auth Utils - Xử lý token hết hạn và logout
 * @author: HoTram
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { router } from 'expo-router';

/**
 * Xử lý khi token hết hạn
 * - Hiển thị thông báo
 * - Xóa thông tin đăng nhập
 * - Chuyển về màn hình login
 */
export const handleTokenExpired = async () => {
  try {
    // Xóa tất cả thông tin đăng nhập
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    
    // Hiển thị thông báo
    Alert.alert(
      'Phiên đăng nhập hết hạn',
      'Vui lòng đăng nhập lại để tiếp tục sử dụng.',
      [
        {
          text: 'Đăng nhập',
          onPress: () => {
            try {
              router.replace('/(auth)/login');
            } catch (error) {
              console.log('Navigation error:', error);
            }
          },
        },
      ],
      { cancelable: false }
    );
  } catch (error) {
    console.log('Error handling token expiration:', error);
  }
};

/**
 * Kiểm tra lỗi có phải là lỗi authentication không
 * @param {Error} error - Error object
 * @returns {boolean}
 */
export const isAuthError = (error) => {
  return (
    error.response?.status === 401 ||
    error.response?.status === 403 ||
    error.message?.includes('token') ||
    error.message?.includes('unauthorized')
  );
};
