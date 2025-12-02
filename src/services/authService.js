/**
 * @author: HoTram
 * Gọi xử lý api authen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_API_URL } from '../config/apiConfig';

/**
 * Tự động xử lý token: tự thêm header Authorization khi cần, bỏ qua khi không cần.
 */
const createAuthClient = () => {
  const request = async (endpoint, options = {}) => {
    const url = `${AUTH_API_URL}${endpoint}`;
    
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data: data,
          },
          message: data.message || 'Request failed',
        };
      }
      
      return { data };
    } catch (error) {
      throw error;
    }
  };
  
  return {
    post: (endpoint, data) => request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    }),
    
    postAuth: (endpoint, data) => request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };
};

const authApi = createAuthClient();

// Authentication Service
export const authService = {
  // Send OTP for registration
  sendOtpRegister: async (email) => {
    const response = await authApi.post('/auth/send-otp-register', { email });
    return response.data;
  },

  // Send OTP for password reset
  sendOtpResetPassword: async (email) => {
    const response = await authApi.post('/auth/send-otp-reset-password', { email });
    return response.data;
  },

  // Register user with OTP verification
  register: async (userData) => {
    const response = await authApi.post('/auth/register', userData);
    return response.data;
  },

  // Login user (supports email)
  login: async (credentials) => {
    const { login: loginValue, password } = credentials;
    
    try {
      const response = await authApi.post('/auth/login', {
        login: loginValue,
        password
      });
      
      // Check if has pendingData (multiple roles, first login, etc)
      if (response.data.pendingData) {
        return response.data;
      }
      
      const { accessToken, refreshToken, user } = response.data;
      
      // Save tokens and user info to AsyncStorage
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      // Save selected role for single-role users
      const userRoles = user.roles || (user.role ? [user.role] : []);
      if (userRoles.length === 1) {
        await AsyncStorage.setItem('selectedRole', userRoles[0]);
      }
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Logout user with refresh token
  logout: async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await authApi.postAuth('/auth/logout', { refreshToken });
      } catch {
        // Silently handle logout API errors
      }
    }
    
    // Clear tokens from AsyncStorage
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('selectedRole');
  },

  // Refresh access token
  refreshToken: async (refreshToken) => {
    const response = await authApi.post('/auth/refresh', { refreshToken });
    const { accessToken } = response.data;
    
    // Update access token in AsyncStorage
    await AsyncStorage.setItem('accessToken', accessToken);
    
    return response.data;
  },

  // Change password (requires current password)
  changePassword: async (passwordData) => {
    const response = await authApi.postAuth('/auth/change-password', passwordData);
    return response.data;
  },

  // Reset password with OTP
  resetPassword: async (resetData) => {
    const response = await authApi.post('/auth/reset-password', resetData);
    return response.data;
  },

  // Verify OTP for registration
  verifyOtp: async (otp, email) => {
    const response = await authApi.post('/auth/verify-otp-register', { email, otp });
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
  },

  // Get current user
  getCurrentUser: async () => {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get access token
  getAccessToken: async () => {
    return await AsyncStorage.getItem('accessToken');
  },

  // Get refresh token
  getRefreshToken: async () => {
    return await AsyncStorage.getItem('refreshToken');
  },

  // Update user info in AsyncStorage
  updateUserInfo: async (userData) => {
    const currentUser = await authService.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    }
    return null;
  },

  // Clear all auth data
  clearAuthData: async () => {
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('selectedRole');
  },

  // Select role (for users with multiple roles)
  selectRole: async (tempToken, selectedRole) => {
    const response = await authApi.post('/auth/select-role', {
      tempToken,
      selectedRole
    });
    const { accessToken, refreshToken, user } = response.data;
    
    // Save tokens and user to AsyncStorage
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.setItem('selectedRole', selectedRole);
    
    return response.data;
  },

  // Complete forced password change (default password or first login)
  completePasswordChange: async (tempToken, newPassword, confirmPassword) => {
    const response = await authApi.post('/auth/complete-password-change', {
      tempToken,
      newPassword,
      confirmPassword
    });
    
    // Check if role selection is required (multi-role user)
    if (response.data.pendingData?.requiresRoleSelection) {
      return response.data;
    }
    
    // Single role user - save tokens
    const { accessToken, refreshToken, user } = response.data;
    
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    
    // Save selectedRole for single-role users
    const userRoles = user.roles || (user.role ? [user.role] : []);
    if (userRoles.length === 1) {
      await AsyncStorage.setItem('selectedRole', userRoles[0]);
    }
    
    return response.data;
  },

  // Complete specialty selection (for dentists with multiple specialties)
  completeSpecialtySelection: async (tempToken, specialty) => {
    const response = await authApi.post('/auth/complete-specialty-selection', {
      tempToken,
      specialty
    });
    
    const { accessToken, refreshToken, user } = response.data;
    
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },
};

export default authService;
