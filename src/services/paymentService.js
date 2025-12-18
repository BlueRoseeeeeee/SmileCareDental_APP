/**
 * @author: HoTram
 * Payment Service - Quản lý thanh toán
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URLS } from '../config/apiConfig';
import { handleTokenExpired } from '../utils/authUtils';

const PAYMENT_URL = API_URLS.payment;

// Create axios instance for payment service
const paymentApi = axios.create({
  baseURL: PAYMENT_URL,
  timeout: 30000, // 30s
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
paymentApi.interceptors.request.use(
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
paymentApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      await handleTokenExpired();
    }
    return Promise.reject(error);
  }
);

const paymentService = {
  /**
   * Tạo URL thanh toán VNPay
   * @param {Object} paymentData - Thông tin thanh toán
   * @returns {Promise} Response từ API
   */
  createVNPayUrl: async (paymentData) => {
    try {
      console.log('[paymentService] Create VNPay URL request:', paymentData);
      const response = await paymentApi.post('/payments/vnpay/create-url', paymentData);
      console.log('[paymentService] Create VNPay URL response:', response.data);
      return response.data;
    } catch (error) {
      console.log('[paymentService] Create VNPay URL error:', error);
      throw error;
    }
  },

  /**
   * Xác minh callback từ VNPay
   * @param {Object} queryParams - Query parameters từ VNPay callback
   * @returns {Promise} Response từ API
   */
  verifyVNPayCallback: async (queryParams) => {
    try {
      console.log('[paymentService] Verify VNPay callback request:', queryParams);
      const response = await paymentApi.get('/payments/vnpay/callback', { params: queryParams });
      console.log('[paymentService] Verify VNPay callback response:', response.data);
      return response.data;
    } catch (error) {
      console.log('[paymentService] Verify VNPay callback error:', error);
      throw error;
    }
  },

  /**
   * Lấy thông tin thanh toán theo orderId
   * @param {string} orderId - ID của order
   * @returns {Promise} Response từ API
   */
  getPaymentByOrderId: async (orderId) => {
    try {
      const response = await paymentApi.get(`/payments/order/${orderId}`);
      return response.data;
    } catch (error) {
      console.log('[paymentService] Get payment by orderId error:', error);
      throw error;
    }
  },

  /**
   * Lấy lịch sử thanh toán của user
   * @param {Object} params - Query parameters
   * @returns {Promise} Response từ API
   */
  getPaymentHistory: async (params = {}) => {
    try {
      const response = await paymentApi.get('/payments/my-payments', { params });
      return response.data;
    } catch (error) {
      console.log('[paymentService] Get payment history error:', error);
      throw error;
    }
  },

  /**
   * Tạo link thanh toán Stripe
   * @param {Object} paymentData - Thông tin thanh toán
   * @returns {Promise} Response từ API
   */
  createStripePaymentLink: async (paymentData) => {
    try {
      const response = await paymentApi.post('/payments/stripe/create-payment-link', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default paymentService;
export { paymentApi };
