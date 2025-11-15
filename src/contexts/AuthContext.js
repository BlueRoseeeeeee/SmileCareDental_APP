/**
 * @author: HoTram
 * Authentication Context for React Native App
 * Quản lý trạng thái đăng nhập/đăng xuất và thông tin người dùng 
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await authService.isAuthenticated();
        const userData = await authService.getCurrentUser();
        
        if (isAuth && userData) {
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      }
 
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // Chức năng đăng nhập
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      //Gọi service login (authService.login) gửi credentials lên BE.
      const response = await authService.login(credentials);
      // AuthContext phát hiện login chưa hoàn tất (pending data) → không update state -> quay về màn hình đăng nhập
      if (response.pendingData) {
        setLoading(false);
        return response;
      }
      // Nếu login thành công thì update state (isAuthenticated, user)
      setIsAuthenticated(true); // đánh dấu người dùng đã đăng nhập
      setUser(response.user); // lưu thông tin người dùng vào context
      setLoading(false);
      
      return response;
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Đăng nhập thất bại');
      setLoading(false);
      throw error;
    }
  };

  // Chức năng logout
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Clear lỗi hiện tại trong state khi người dùng thử lại
  //  Hàm xóa thông báo lỗi, đặt error về null
  const clearError = () => {
    setError(null);
  };

  // Send OTP for registration
  const sendOtpRegister = async (email) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.sendOtpRegister(email);
      setLoading(false);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Gửi OTP thất bại');
      setLoading(false);
      throw error;
    }
  };

  // Verify OTP
  const verifyOtp = async (otp, email) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.verifyOtp(otp, email);
      setLoading(false);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Xác thực OTP thất bại');
      setLoading(false);
      throw error;
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.register(userData);
      setLoading(false);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Đăng ký thất bại');
      setLoading(false);
      throw error;
    }
  };

  // Send OTP for reset password
  const sendOtpResetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.sendOtpResetPassword(email);
      setLoading(false);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Gửi OTP thất bại');
      setLoading(false);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (resetData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.resetPassword(resetData);
      setLoading(false);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Reset mật khẩu thất bại');
      setLoading(false);
      throw error;
    }
  };

  // Change password (requires current password)
  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.changePassword(passwordData);
      setLoading(false);
      return response;
    } catch (error) {
      setError(error.response?.data?.message || 'Đổi mật khẩu thất bại');
      setLoading(false);
      throw error;
    }
  };

  // Update user info
  const updateUser = async (userData) => {
    try {
      const updatedUser = await authService.updateUserInfo(userData);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  // Complete login after password change or specialty selection
  const completeLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    error,
    login,
    logout,
    clearError,
    sendOtpRegister,
    verifyOtp,
    register,
    sendOtpResetPassword,
    resetPassword,
    changePassword,
    updateUser,
    completeLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
