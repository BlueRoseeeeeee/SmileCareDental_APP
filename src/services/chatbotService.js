/**
 * @author: HoTram
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URLS } from '../config/apiConfig';
import { handleTokenExpired } from '../utils/authUtils';

const CHATBOT_URL = API_URLS.chatbot;
const CHATBOT_API_URL = '/ai';

// Create axios instance for chatbot service
const chatbotApi = axios.create({
  baseURL: CHATBOT_URL,
  timeout: 60000, // 60s for AI responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
chatbotApi.interceptors.request.use(
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
chatbotApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      await handleTokenExpired();
    }
    return Promise.reject(error);
  }
);

const chatbotService = {
  /**
   * Send message to chatbot
   * @param {string} message - User message
   * @returns {Promise} Response from chatbot
   */
  sendMessage: async (message) => {
    try {
      console.log('📤 [chatbotService] Send message:', message);
      const userId = await AsyncStorage.getItem('user');
      const userObj = userId ? JSON.parse(userId) : null;

      const response = await chatbotApi.post(`${CHATBOT_API_URL}/chat`, {
        message,
        userId: userObj?._id || 'anonymous',
      });

      console.log('📥 [chatbotService] Send message response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [chatbotService] Send message error:', error);
      throw error;
    }
  },

  /**
   * Get chat history
   * @param {number} limit - Number of messages to retrieve
   * @returns {Promise} Chat history
   */
  getHistory: async (limit = 100) => {
    try {
      console.log('📤 [chatbotService] Get history, limit:', limit);
      const response = await chatbotApi.get(`${CHATBOT_API_URL}/history`, {
        params: { limit },
      });

      console.log('📥 [chatbotService] Get history response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [chatbotService] Get history error:', error);
      throw error;
    }
  },

  /**
   * Clear chat history
   * @returns {Promise}
   */
  clearHistory: async () => {
    try {
      console.log('📤 [chatbotService] Clear history');
      const response = await chatbotApi.delete(`${CHATBOT_API_URL}/history`);
      console.log('📥 [chatbotService] Clear history response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [chatbotService] Clear history error:', error);
      throw error;
    }
  },

  /**
   * Analyze teeth image
   * @param {Object} imageFile - Image file object with uri
   * @param {string} message - Optional message about the image
   * @returns {Promise} Analysis result
   */
  analyzeImage: async (imageFile, message = '') => {
    try {
      console.log('📤 [chatbotService] Analyze image:', imageFile.uri);
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageFile.uri,
        type: imageFile.type || 'image/jpeg',
        name: imageFile.fileName || 'teeth-image.jpg',
      });
      
      if (message) {
        formData.append('message', message);
      }

      const response = await chatbotApi.post(
        `${CHATBOT_API_URL}/analyze-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('📥 [chatbotService] Analyze image response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [chatbotService] Analyze image error:', error);
      throw error;
    }
  },
};

export default chatbotService;
export { chatbotApi };
