/**
 * @author: HoTram
 * Record Service - Quản lý hồ sơ bệnh án
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RECORD_URL } from '../config/apiConfig';

const createRecordClient = () => {
  return {
    get: async (url, params = {}) => {
      const token = await AsyncStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const queryString = new URLSearchParams(params).toString();
      const fullUrl = `${RECORD_URL}${url}${queryString ? `?${queryString}` : ''}`;

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

const recordApi = createRecordClient();

const recordService = {
  // Lấy dịch vụ chưa sử dụng từ bệnh án khám
  getUnusedServices: async (patientId) => {
    try {
      const response = await recordApi.get(`/api/record/patient/${patientId}/unused-services`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching unused services:', error);
      throw error;
    }
  },

  // Lấy chỉ định điều trị
  getTreatmentIndications: async (patientId, serviceId) => {
    try {
      const response = await recordApi.get(
        `/api/record/patient/${patientId}/treatment-indications`,
        { serviceId }
      );
      return response;
    } catch (error) {
      console.error('❌ Error fetching treatment indications:', error);
      throw error;
    }
  },

  // Lấy thông tin bệnh án theo ID
  getRecordById: async (recordId) => {
    try {
      const response = await recordApi.get(`/api/record/${recordId}`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching record:', error);
      throw error;
    }
  },

  // Lấy bệnh án theo bệnh nhân
  getRecordsByPatient: async (patientId, limit = 100) => {
    try {
      const response = await recordApi.get(`/api/record/patient/${patientId}`, { limit });
      return response;
    } catch (error) {
      console.error('❌ Error fetching patient records:', error);
      throw error;
    }
  },
};

export default recordService;
