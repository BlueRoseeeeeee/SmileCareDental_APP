/**
 * @author: HoTram
 * Service Service - Quản lý dịch vụ
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVICE_URL } from '../config/apiConfig';

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
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return response.json();
    },
  };
};

const serviceApi = createServiceClient();

const serviceService = {
  // Lấy tất cả services
  getAllServices: async () => {
    try {
      const response = await serviceApi.get('/service?page=1&limit=1000');
      return {
        services: response.data || [],
        total: response.pagination?.total || 0,
      };
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      throw error;
    }
  },

  // Lấy chi tiết service theo ID
  getServiceById: async (serviceId) => {
    try {
      const response = await serviceApi.get(`/service/${serviceId}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching service:', error);
      throw error;
    }
  },
};

export default serviceService;
