/**
 * @author: HoTram
 * Schedule Config Service - Quản lý cấu hình hệ thống
 */
import { SCHEDULE_URL } from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleTokenExpired } from '../utils/authUtils';

const scheduleConfigService = {
  // Lấy cấu hình hệ thống
  getConfig: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      const response = await fetch(`${SCHEDULE_URL}/schedule/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Handle token expiration
      if (!response.ok && (response.status === 401 || response.status === 403)) {
        await handleTokenExpired();
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Lấy danh sách ngày nghỉ lễ
  getHolidays: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      const response = await fetch(`${SCHEDULE_URL}/schedule/config/holidays`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Handle token expiration
      if (!response.ok && (response.status === 401 || response.status === 403)) {
        await handleTokenExpired();
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
};

export default scheduleConfigService;
