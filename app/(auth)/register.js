/**
 * @author: HoTram
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator, 
  Image
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
  primary: '#2596be',
  secondary: '#4caf50',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  error: '#f44336',
  border: '#dddddd',
  success: '#4caf50',
};

const STEPS = {
  EMAIL: 0,
  OTP: 1,
  INFO: 2,
  PASSWORD: 3,
};

export default function RegisterScreen() {
  const [currentStep, setCurrentStep] = useState(STEPS.EMAIL);
  
  // Form data
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('male');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  
  const {
    sendOtpRegister,
    verifyOtp,
    register: registerUser,
    loading,
    clearError,
  } = useAuth();

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ!');
      return;
    }

    try {
      clearError();
      const response = await sendOtpRegister(email);
      Alert.alert('Thành công', response.message || 'OTP đã được gửi đến email của bạn');
      setCurrentStep(STEPS.OTP);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Gửi OTP thất bại');
    }
  };

  // Helper function: Format date to DD/MM/YYYY for display
  const formatDateDisplay = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function: Format date to YYYY-MM-DD for API
  const formatDateForAPI = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Handler for DatePicker change
  const onDateChange = (event, selected) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selected) {
      setSelectedDate(selected);
      setDateOfBirth(formatDateForAPI(selected));
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP 6 chữ số!');
      return;
    }

    try {
      clearError();
      await verifyOtp(otp, email);
      Alert.alert('Thành công', 'OTP đã được xác thực!');
      setOtpVerified(true);
      setCurrentStep(STEPS.INFO);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Xác thực OTP thất bại');
    }
  };

  // Step 3: Personal Info
  const handlePersonalInfo = () => {
    if (!fullName || !phone || !dateOfBirth) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    // Validate phone
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('Lỗi', 'Số điện thoại phải có 10 chữ số!');
      return;
    }

    // Validate date format (YYYY-MM-DD or DD/MM/YYYY)
    const dateRegexYMD = /^\d{4}-\d{2}-\d{2}$/;
    const dateRegexDMY = /^\d{2}\/\d{2}\/\d{4}$/;
    
    if (!dateRegexYMD.test(dateOfBirth) && !dateRegexDMY.test(dateOfBirth)) {
      Alert.alert('Lỗi', 'Ngày sinh không hợp lệ. Vui lòng chọn từ lịch hoặc nhập theo định dạng DD/MM/YYYY');
      return;
    }
    
    // Validate age (must be at least 1 year old)
    const today = new Date();
    const birthDate = new Date(dateOfBirth.includes('/') 
      ? dateOfBirth.split('/').reverse().join('-') 
      : dateOfBirth);
    
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 1 || isNaN(age)) {
      Alert.alert('Lỗi', 'Ngày sinh không hợp lệ');
      return;
    }

    setCurrentStep(STEPS.PASSWORD);
  };

  // Step 4: Create Password & Complete Registration
  const handleRegister = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mật khẩu!');
      return;
    }

    if (password.length < 8 || password.length > 16) {
      Alert.alert('Lỗi', 'Mật khẩu phải có từ 8-16 ký tự!');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      clearError();
      const userData = {
        email,
        fullName,
        phone,
        dateOfBirth,
        gender,
        password,
        confirmPassword,
        role: 'patient',
      };

      const response = await registerUser(userData);
      Alert.alert(
        'Thành công',
        response.message || 'Đăng ký thành công! Vui lòng đăng nhập.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2, 3].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            step <= currentStep && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.EMAIL:
        return (
          <View>
            <Text style={styles.stepTitle}>Bước 1: Xác thực Email</Text>
            <Text style={styles.stepDescription}>
              Nhập email để nhận mã OTP
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Gửi mã OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      case STEPS.OTP:
        return (
          <View>
            <Text style={styles.stepTitle}>Bước 2: Xác thực OTP</Text>
            <Text style={styles.stepDescription}>
              Nhập mã OTP đã gửi đến {email}
            </Text>

            {otpVerified && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.successText}>OTP đã được xác thực!</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập mã OTP (6 chữ số)"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={otpVerified ? () => setCurrentStep(STEPS.INFO) : handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {otpVerified ? 'Tiếp theo' : 'Xác thực OTP'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(STEPS.EMAIL)}
            >
              <Text style={styles.backButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        );

      case STEPS.INFO:
        return (
          <View style={{marginTop:'40px'}}>
            <Text style={styles.stepTitle}>Bước 3: Thông tin cá nhân</Text>
            <Text style={styles.stepDescription}>
              Nhập thông tin cơ bản của bạn
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Họ và tên"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại (10 chữ số)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            <View style={styles.datePickerWrapper}>
              <Text style={styles.dateLabel}>Ngày sinh</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <Text style={[styles.datePickerText, dateOfBirth && styles.datePickerTextSelected]}>
                  {dateOfBirth ? formatDateDisplay(dateOfBirth.includes('/') ? dateOfBirth.split('/').reverse().join('-') : dateOfBirth) : 'Chọn ngày sinh'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
              
              {/* DatePicker Modal */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                />
              )}
              
              {Platform.OS === 'ios' && showDatePicker && (
                <View style={styles.iosPickerContainer}>
                  <View style={styles.iosPickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.iosPickerButton}>Xong</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Giới tính:</Text>
              <View style={styles.genderOptions}>
                {['male', 'female'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderOption,
                      gender === g && styles.genderOptionActive,
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderOptionText,
                        gender === g && styles.genderOptionTextActive,
                      ]}
                    >
                      {g === 'male' ? 'Nam' : 'Nữ'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handlePersonalInfo}
            >
              <Text style={styles.buttonText}>Tiếp theo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(STEPS.OTP)}
            >
              <Text style={styles.backButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        );

      case STEPS.PASSWORD:
        return (
          <View>
            <Text style={styles.stepTitle}>Bước 4: Tạo mật khẩu</Text>
            <Text style={styles.stepDescription}>
              Tạo mật khẩu bảo mật (8-16 ký tự)
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Xác nhận mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>Hoàn thành đăng ký</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(STEPS.INFO)}
            >
              <Text style={styles.backButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header - Ẩn logo ở bước 3 để tiết kiệm không gian */}
        {currentStep !== STEPS.INFO && (
          <View style={styles.header}>
            <View style={styles.logoCircle}>
             <Image source={require('../../assets/smileCare_img/smile-dental-logo.png')}/>
            </View>
            <Text style={styles.registerTitle}>ĐĂNG KÝ TÀI KHOẢN</Text>
          </View>
        )}

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form */}
        <View style={styles.formSection}>
          {renderStepContent()}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Đã có tài khoản? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    marginTop:50, 
    display: 'flex',
    gap:15

  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  registerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    marginHorizontal: 6,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  formSection: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.text,
  },
  datePickerWrapper: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textLight,
  },
  datePickerTextSelected: {
    color: COLORS.text,
    fontWeight: '500',
  },
  iosPickerContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iosPickerButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  eyeIcon: {
    padding: 4,
  },
  genderContainer: {
    marginBottom: 24,
  },
  genderLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
    fontWeight: '500',
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  genderOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  genderOptionTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
