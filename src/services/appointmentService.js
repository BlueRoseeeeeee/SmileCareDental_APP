/**
 * @author: HoTram
 * Appointment Service - Quản lý đặt lịch khám
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { APPOINTMENT_URL } from '../config/apiConfig';
import { handleTokenExpired } from '../utils/authUtils';

// Create axios instance for appointment service
const appointmentApi = axios.create({
  baseURL: APPOINTMENT_URL,
  timeout: 30000, // 30s
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
appointmentApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
appointmentApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      await handleTokenExpired();
    }
    return Promise.reject(error);
  }
);

const appointmentService = {
  /**
   * Reserve appointment (tạo reservation tạm thời)
   * @param {Object} reservationData - Thông tin reservation
   * @returns {Promise} Response từ API
   */
  reserveAppointment: async (reservationData) => {
    try {
      console.log(' [appointmentService] Reserve appointment request:', reservationData);
      const response = await appointmentApi.post('/appointments/reserve', reservationData);
      console.log(' [appointmentService] Reserve appointment response:', response.data);
      return response.data;
    } catch (error) {
      console.log(' [appointmentService] Reserve appointment error:', error);
      throw error;
    }
  },

  /**
   * Create offline appointment (walk-in) - tạo trực tiếp, không qua payment
   * @param {Object} appointmentData - Thông tin appointment
   * @returns {Promise} Response từ API
   */
  createOfflineAppointment: async (appointmentData) => {
    try {
      console.log(' [appointmentService] Create offline appointment request:', appointmentData);
      const response = await appointmentApi.post('/appointments/create-offline', appointmentData);
      console.log(' [appointmentService] Create offline appointment response:', response.data);
      return response.data;
    } catch (error) {
      console.log('[appointmentService] Create offline appointment error:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách appointments của patient hiện tại
   * @param {Object} params - Query parameters (status, page, limit)
   * @returns {Promise} Response từ API
   */
  getMyAppointments: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);

      const url = `/appointments/my-appointments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await appointmentApi.get(url);
      return response.data;
    } catch (error) {
      console.log('[appointmentService] Get my appointments error:', error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết appointment theo ID
   * @param {string} appointmentId - ID của appointment
   * @returns {Promise} Response từ API
   */
  getAppointmentById: async (appointmentId) => {
    try {
      const response = await appointmentApi.get(`/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.log(' [appointmentService] Get appointment by ID error:', error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết appointment theo code
   * @param {string} appointmentCode - Code của appointment
   * @returns {Promise} Response từ API
   */
  getAppointmentByCode: async (appointmentCode) => {
    try {
      const response = await appointmentApi.get(`/appointments/code/${appointmentCode}`);
      return response.data;
    } catch (error) {
      console.log('[appointmentService] Get appointment by code error:', error);
      throw error;
    }
  },

  /**
   * Hủy appointment
   * @param {string} appointmentId - ID của appointment
   * @param {string} reason - Lý do hủy
   * @returns {Promise} Response từ API
   */
  cancelAppointment: async (appointmentId, reason) => {
    try {
      const response = await appointmentApi.post(`/appointments/${appointmentId}/cancel`, {
        reason: reason
      });
      return response.data;
    } catch (error) {
      console.log('[appointmentService] Cancel appointment error:', error);
      throw error;
    }
  },

  /**
   * Patient request cancellation (must be >=24 hours before appointment)
   * @param {string} appointmentId - ID của appointment
   * @param {string} reason - Lý do hủy (min 10 characters)
   * @returns {Promise} Response từ API
   */
  requestCancellation: async (appointmentId, reason) => {
    try {
      console.log('[appointmentService] Request cancellation:', { appointmentId, reason });
      const response = await appointmentApi.post(`/appointments/${appointmentId}/request-cancellation`, {
        reason: reason
      });
      console.log('[appointmentService] Request cancellation response:', response.data);
      return response.data;
    } catch (error) {
      console.log('[appointmentService] Request cancellation error:', error);
      throw error;
    }
  },

  /**
   * Check-in appointment
   * @param {string} appointmentId - ID của appointment
   * @param {string} notes - Ghi chú
   * @returns {Promise} Response từ API
   */
  checkInAppointment: async (appointmentId, notes = '') => {
    try {
      const response = await appointmentApi.post(`/appointments/${appointmentId}/check-in`, {
        notes
      });
      return response.data;
    } catch (error) {
      console.log('[appointmentService] Check-in appointment error:', error);
      throw error;
    }
  },

  /**
   * Complete appointment
   * @param {string} appointmentId - ID của appointment
   * @param {string} notes - Ghi chú
   * @returns {Promise} Response từ API
   */
  completeAppointment: async (appointmentId, notes = '') => {
    try {
      const response = await appointmentApi.post(`/appointments/${appointmentId}/complete`, {
        notes
      });
      return response.data;
    } catch (error) {
      console.log('[appointmentService] Complete appointment error:', error);
      throw error;
    }
  },
};

export default appointmentService;
export { appointmentApi };

