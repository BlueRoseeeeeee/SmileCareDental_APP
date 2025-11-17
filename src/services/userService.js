/**
 * @author: HoTram
 * Quản lý thông tin người dùng
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URLS } from '../config/apiConfig';
import { handleTokenExpired } from '../utils/authUtils';

const USER_API_URL = API_URLS.user;

const createUserClient = () => {
  const request = async (endpoint, options = {}) => {
    const url = `${USER_API_URL}${endpoint}`;
    
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const headers = {
        ...options.headers,
      };
      // Only add Content-Type for non-FormData requests
      // Chỉ set Content-Type: application/json khi không dùng FormData
      //(FormData tự tạo Content-Type, đặt thủ công sẽ gây lỗi)
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const fetchOptions = {
        ...options,
        headers,
      };

      // Nếu body không phải FormData thì chuyển thành JSON (FormData thì giữ nguyên)
      if (options.body && !(options.body instanceof FormData)) {
        fetchOptions.body = JSON.stringify(options.body);
      }
      
      const response = await fetch(url, fetchOptions);
      const data = await response.json();
      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401 || response.status === 403) {
          await handleTokenExpired();
        }
        throw {
          response: {
            status: response.status,
            data: data,
          },
          message: data.message || 'Request failed',
        };
      }
      
      return { data };
    } catch (error) {
      console.error('User API Error:', error);
      throw error;
    }
  };
  return {
    get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
    put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
    patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
    delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  };
};

const userClient = createUserClient();

const userService = {
  /**
   * Get public list of dentists (for booking)
   */
  getPublicDentists: async () => {
    try {
      const response = await userClient.get('/user/public/dentists');
      return response.data;
    } catch (error) {
      console.error('Get public dentists error:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {Object} updateData - Profile data to update (fullName, phone, dateOfBirth, gender, address)
   */
  updateProfile: async (updateData) => {
    try {
      const response = await userClient.put('/user/profile', updateData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  /**
   * Update user avatar
   * @param {FormData} formData - FormData with avatar file
   */
  updateAvatar: async (formData) => {
    try {
      // Lấy userID từ storage
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user?._id) {
        throw new Error('User ID not found');
      }

      const token = await AsyncStorage.getItem('accessToken');
      
      const response = await fetch(`${USER_API_URL}/user/avatar/${user._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data: data,
          },
          message: data.message || 'Upload avatar failed',
        };
      }

      return data;
    } catch (error) {
      console.error('Update avatar error:', error);
      throw error;
    }
  },

  /**
   * Get user profile by ID
   */
  getUserById: async (userId) => {
    try {
      const response = await userClient.get(`/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  },
};

export default userService;
