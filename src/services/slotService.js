/**
 * @author: HoTram
 * Slot Service - Quản lý ca làm việc
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHEDULE_URL } from '../config/apiConfig';

const createSlotClient = () => {
  return {
    get: async (url, params = {}) => {
      const token = await AsyncStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const queryString = new URLSearchParams(params).toString();
      const fullUrl = `${SCHEDULE_URL}${url}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(fullUrl, {
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

const slotApi = createSlotClient();

const slotService = {
  // Lấy danh sách nha sỹ và slot gần nhất
  getDentistsWithNearestSlot: async (serviceDuration = 15, serviceId = null) => {
    try {
      const params = { serviceDuration };
      if (serviceId) {
        params.serviceId = serviceId;
      }
      
      const response = await slotApi.get('/slot/dentists-with-nearest-slot', params);
      return response;
    } catch (error) {
      console.error('❌ Error fetching dentists:', error);
      throw error;
    }
  },

  // Lấy danh sách ngày làm việc của nha sỹ
  getDentistWorkingDates: async (dentistId, serviceDuration = 15, serviceId = null) => {
    try {
      const params = { serviceDuration };
      if (serviceId) {
        params.serviceId = serviceId;
      }
      
      const response = await slotApi.get(`/slot/dentist/${dentistId}/working-dates`, params);
      return response;
    } catch (error) {
      console.error('❌ Error fetching working dates:', error);
      throw error;
    }
  },

  // Lấy slots của nha sỹ theo ngày
  getDentistSlotsFuture: async (dentistId, params = {}) => {
    try {
      const response = await slotApi.get(`/slot/dentist/${dentistId}/details/future`, params);
      return response;
    } catch (error) {
      console.error('❌ Error fetching dentist slots:', error);
      throw error;
    }
  },
};

export default slotService;
