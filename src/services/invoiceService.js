/**
 * @author: HoTram
 * Invoice Service - Quản lý hóa đơn
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URLS } from '../config/apiConfig';
import { handleTokenExpired } from '../utils/authUtils';

const INVOICE_URL = API_URLS.invoice;

// Create axios instance for invoice service
const invoiceApi = axios.create({
  baseURL: INVOICE_URL,
  timeout: 30000, // 30s
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
invoiceApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
invoiceApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      await handleTokenExpired();
    }
    return Promise.reject(error);
  }
);

const invoiceService = {
  /**
   * Lấy danh sách hóa đơn của bệnh nhân hiện tại
   * @param {Object} params - Query parameters (page, limit, status, sortBy, sortOrder)
   * @returns {Promise} Response từ API
   */
  getMyInvoices: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.status) queryParams.append('status', params.status);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const url = `/invoice/my-invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('📤 [invoiceService] Get my invoices request:', url);
      
      const response = await invoiceApi.get(url);
      console.log('📥 [invoiceService] Get my invoices response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [invoiceService] Get my invoices error:', error);
      throw error;
    }
  },

  /**
   * Lấy chi tiết hóa đơn theo ID
   * @param {string} invoiceId - ID của hóa đơn
   * @returns {Promise} Response từ API
   */
  getInvoiceById: async (invoiceId) => {
    try {
      console.log('📤 [invoiceService] Get invoice by ID:', invoiceId);
      const response = await invoiceApi.get(`/invoice/${invoiceId}`);
      console.log('📥 [invoiceService] Get invoice by ID response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [invoiceService] Get invoice by ID error:', error);
      throw error;
    }
  },

  /**
   * Lấy hóa đơn theo invoice number
   * @param {string} invoiceNumber - Invoice number
   * @returns {Promise} Response từ API
   */
  getInvoiceByNumber: async (invoiceNumber) => {
    try {
      const response = await invoiceApi.get(`/invoice/number/${invoiceNumber}`);
      return response.data;
    } catch (error) {
      console.error('❌ [invoiceService] Get invoice by number error:', error);
      throw error;
    }
  },

  /**
   * Tải PDF hóa đơn
   * @param {string} invoiceId - ID của hóa đơn
   * @returns {Promise} Response từ API
   */
  downloadInvoicePDF: async (invoiceId) => {
    try {
      const response = await invoiceApi.get(`/invoice/${invoiceId}/pdf`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('❌ [invoiceService] Download invoice PDF error:', error);
      throw error;
    }
  },

  /**
   * Thống kê hóa đơn
   * @param {Object} params - Query parameters
   * @returns {Promise} Response từ API
   */
  getInvoiceStats: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const url = `/invoice/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await invoiceApi.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ [invoiceService] Get invoice stats error:', error);
      throw error;
    }
  },
};

export default invoiceService;
export { invoiceApi };
