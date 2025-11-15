/**
 * @author: HoTram
 * Schedule Config Service - Quản lý cấu hình hệ thống
 */
import { SCHEDULE_URL } from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const scheduleConfigService = {
  // Lấy cấu hình hệ thống
  getConfig: async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${SCHEDULE_URL}/schedule/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching schedule config:', error);
      throw error;
    }
  },
};

export default scheduleConfigService;
