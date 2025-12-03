/**
 * @author: HoTram
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URLS } from '../config/apiConfig';
import { handleTokenExpired } from '../utils/authUtils';

const CHATBOT_URL = API_URLS.chatbot;
const CHATBOT_API_URL = '/ai'; // Backend mounts chatbot routes at /api/ai

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
      
      //  If sending FormData, delete Content-Type header
      // Let axios automatically set it with correct boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    } catch (error) {
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
   * Send message to chatbot (text only or text + image)
   * @param {string} message - User message
   * @param {Object} imageFile - Optional image file object with uri
   * @returns {Promise} Response from chatbot
   */
  sendMessage: async (message, imageFile = null) => {
    try {
      const userId = await AsyncStorage.getItem('user');
      const userObj = userId ? JSON.parse(userId) : null;

      // If has image, use FormData with fetch (React Native compatibility)
      if (imageFile) {
        const formData = new FormData();
        
        // 🔧 React Native FormData format - MUST include all fields
        const imageData = {
          uri: imageFile.uri,
          type: imageFile.type || 'image/jpeg',
          name: imageFile.fileName || 'teeth-image.jpg',
        };
        
        formData.append('image', imageData);
        
        if (message) {
          formData.append('message', message);
        }
        
        const endpoint = `${CHATBOT_URL}${CHATBOT_API_URL}/analyze-image`;
        
        // Get token for authorization
        const token = await AsyncStorage.getItem('accessToken');
        
        // Use fetch instead of axios for FormData in React Native
        try {
          const fetchResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : undefined,
              // Don't set Content-Type - React Native will set it automatically with boundary
            },
            body: formData,
          });

          const data = await fetchResponse.json();
          
          if (!fetchResponse.ok) {
            throw {
              response: {
                status: fetchResponse.status,
                data: data,
              },
              message: data.message || 'Image upload failed',
            };
          }

          return data;
        } catch (fetchError) {
          throw fetchError;
        }
      }

      // Text only
      const response = await chatbotApi.post(`${CHATBOT_API_URL}/chat`, {
        message,
        userId: userObj?._id || 'anonymous',
      });

      return response.data;
    } catch (error) {
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
      const response = await chatbotApi.get(`${CHATBOT_API_URL}/history`, {
        params: { limit },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Clear chat history
   * @returns {Promise}
   */
  clearHistory: async () => {
    try {
      const response = await chatbotApi.delete(`${CHATBOT_API_URL}/history`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default chatbotService;
export { chatbotApi };
