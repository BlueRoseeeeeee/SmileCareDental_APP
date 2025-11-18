/**
 * @author: HoTram
 * Service Service - Quản lý dịch vụ
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVICE_URL } from '../config/apiConfig';
import { handleTokenExpired } from '../utils/authUtils';

const createServiceClient = () => {
  return {
    get: async (url, config = {}) => {
      const token = await AsyncStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...config.headers,
      };

      const response = await fetch(`${SERVICE_URL}${url}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401 || response.status === 403) {
          await handleTokenExpired();
        }
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return response.json();
    },
  };
};

const serviceApi = createServiceClient();

const serviceService = {
  // Lấy tất cả services với phân trang
  getServices: async (page = 1, limit = 100) => {
    try {
      const response = await serviceApi.get(`/service?page=${page}&limit=${limit}`);
      return {
        success: true,
        services: response.data || [],
        total: response.pagination?.total || 0,
        page: response.pagination?.page || page,
        limit: response.pagination?.limit || limit,
        totalPages: response.pagination?.totalPages || 1,
      };
    } catch (error) {
      console.error('Lỗi fetching services:', error);
      throw error;
    }
  },

  // Lấy tất cả services (alias cho getAllServices)
  getAllServices: async () => {
    try {
      const response = await serviceApi.get('/service?page=1&limit=1000');
      return {
        services: response.data || [],
        total: response.pagination?.total || 0,
      };
    } catch (error) {
      console.error('Lỗi fetching services:', error);
      throw error;
    }
  },

  // Lấy chi tiết service theo ID
  getServiceById: async (serviceId) => {
    try {
      const response = await serviceApi.get(`/service/${serviceId}`);
      return response;
    } catch (error) {
      console.error(' Lỗi fetching service:', error);
      throw error;
    }
  },

  // Lấy chi tiết service add-on
  getServiceAddOnById: async (serviceId, addOnId) => {
    try {
      const response = await serviceApi.get(`/service/${serviceId}/addons/${addOnId}`);
      return response;
    } catch (error) {
      console.error('Lỗi fetching service add-on:', error);
      throw error;
    }
  },
};

export default serviceService;
