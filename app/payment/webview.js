/**
 * @author: HoTram
 * Payment WebView Screen - Hiển thị VNPay payment trong WebView
 */

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const COLORS = {
  primary: '#2596be',
  secondary: '#2c5f4f',
  background: '#f5f5f5',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0',
};

export default function PaymentWebViewScreen() {
  const [paymentUrl, setPaymentUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('vnpay');
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    loadPaymentUrl();

    // Xử lý nút back của Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, []);

  const loadPaymentUrl = async () => {
    try {
      const url = await AsyncStorage.getItem('payment_url');
      const id = await AsyncStorage.getItem('payment_orderId');
      const method = await AsyncStorage.getItem('payment_method');
      
      if (!url) {
        Alert.alert('Lỗi', 'Không tìm thấy URL thanh toán');
        router.back();
        return;
      }

      setPaymentUrl(url);
      setOrderId(id || '');
      setPaymentMethod(method || 'vnpay');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải URL thanh toán');
      router.back();
    }
  };

  const handleBackPress = () => {
    Alert.alert(
      'Hủy thanh toán?',
      'Bạn có chắc muốn hủy thanh toán? Đặt khám của bạn sẽ bị hủy nếu không thanh toán trong 3 phút.',
      [
        {
          text: 'Tiếp tục thanh toán',
          style: 'cancel',
        },
        {
          text: 'Hủy thanh toán',
          style: 'destructive',
          onPress: () => {
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleNavigationStateChange = (navState) => {
    const { url } = navState;
    setCanGoBack(navState.canGoBack);
    
    console.log('🌐 WebView URL changed:', url);

    //  FIX: Chỉ detect khi backend ĐÃ redirect về /patient/payment/result
    // Đây là URL CUỐI CÙNG sau khi backend đã xử lý xong callback
    // KHÔNG intercept URL callback trung gian để backend có cơ hội xử lý
    
    // Kiểm tra callback từ Stripe - Backend redirect về /patient/payment/result?payment=success/failed
    if (paymentMethod === 'stripe' && url.includes('/patient/payment/result')) {
      console.log('Detected Stripe final result URL (after backend processed)');
      
      const urlParams = parseUrlParams(url);
      const paymentStatus = urlParams.payment; // 'success' hoặc 'failed'
      const orderIdFromUrl = urlParams.orderId || orderId;
      
      console.log('📊 Stripe Response - Payment Status:', paymentStatus);
      console.log('📊 URL Params:', urlParams);
      
      let status = 'error';
      let message = '';
      
      if (paymentStatus === 'success') {
        status = 'success';
        message = 'Giao dịch thành công';
      } else if (paymentStatus === 'failed') {
        status = 'failed';
        message = 'Giao dịch không thành công do: Khách hàng hủy giao dịch';
      } else {
        status = 'failed';
        message = 'Giao dịch không thành công';
      }
      
      setTimeout(() => {
        router.replace({
          pathname: '/payment/result',
          params: {
            status: status,
            orderId: orderIdFromUrl,
            payment: status,
            code: paymentStatus === 'success' ? '00' : '24',
            message: message,
          },
        });
      }, 100);
      
      return;
    }

    // ✅ FIX: Chỉ detect khi backend ĐÃ redirect về /patient/payment/result
    // KHÔNG intercept URL callback từ VNPay (có vnp_ResponseCode)
    // Để backend nhận callback, xử lý payment, tạo appointment, rồi mới redirect
    if (url.includes('/patient/payment/result')) {
      console.log('Detected VNPay final result URL (after backend processed)');
      
      // Parse URL để lấy query params
      const urlParams = parseUrlParams(url);
      const paymentStatus = urlParams.payment; // 'success', 'failed', hoặc 'error'
      const responseCode = urlParams.code || '99';
      const orderIdFromUrl = urlParams.orderId || orderId;
      
      console.log('📊 VNPay Response - Payment Status:', paymentStatus);
      console.log('📊 VNPay Response Code:', responseCode);
      console.log('📊 URL Params:', urlParams);

      // Xác định trạng thái thanh toán
      let status = 'error';
      if (paymentStatus === 'success') {
        status = 'success';
      } else if (paymentStatus === 'failed') {
        status = 'failed';
      } else {
        status = 'error';
      }

      // Đóng WebView và chuyển đến màn Payment Result
      setTimeout(() => {
        router.replace({
          pathname: '/payment/result',
          params: {
            status: status,
            orderId: orderIdFromUrl,
            payment: status,
            code: responseCode,
            message: getVNPayMessage(responseCode),
          },
        });
      }, 100);
      
      return; // Dừng xử lý tiếp
    }
  };

  const parseUrlParams = (url) => {
    const params = {};
    const queryString = url.split('?')[1];
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value || '');
      });
    }
    return params;
  };

  const getVNPayMessage = (responseCode) => {
    const messages = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
      '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
      '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
      '13': 'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
      '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
      '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
      '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá giới hạn giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
      '99': 'Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)',
    };
    return messages[responseCode] || 'Giao dịch không thành công';
  };

  const handleWebViewGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  if (!paymentUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {paymentMethod === 'stripe' ? 'Thanh toán Stripe' : 'Thanh toán VNPay'}
        </Text>
        <TouchableOpacity 
          onPress={handleWebViewGoBack} 
          style={styles.backButton}
          disabled={!canGoBack}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={canGoBack ? COLORS.text : COLORS.border} 
          />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: paymentUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={(request) => {
          const { url } = request;
          console.log('Should load URL:', url);
          
          // CHỈ chặn URL RESULT CUỐI CÙNG từ backend (sau khi đã xử lý xong)
          // KHÔNG chặn URL callback trung gian để backend có cơ hội nhận request
          
          // Chặn load trang RESULT của Stripe (đã xử lý xong)
          if (paymentMethod === 'stripe' && url.includes('/patient/payment/result')) {
            console.log('Detected Stripe result URL - intercepting');
            
            const urlParams = parseUrlParams(url);
            const paymentStatus = urlParams.payment;
            const orderIdFromUrl = urlParams.orderId || orderId;
            
            let status = 'error';
            if (paymentStatus === 'success') {
              status = 'success';
            } else if (paymentStatus === 'failed') {
              status = 'failed';
            }
            
            setTimeout(() => {
              router.replace({
                pathname: '/payment/result',
                params: {
                  status: status,
                  orderId: orderIdFromUrl,
                  payment: status,
                  code: paymentStatus === 'success' ? '00' : '24',
                  message: paymentStatus === 'success' ? 'Giao dịch thành công' : 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
                },
              });
            }, 100);
            
            return false;
          }
          
          // Chặn load trang RESULT của VNPay (đã xử lý xong)
          if (url.includes('/patient/payment/result')) {
            console.log('Detected VNPay result URL - intercepting');
            
            const urlParams = parseUrlParams(url);
            const paymentStatus = urlParams.payment;
            const responseCode = urlParams.code || '99';
            const orderIdFromUrl = urlParams.orderId || orderId;
            
            let status = 'error';
            if (paymentStatus === 'success') {
              status = 'success';
            } else if (paymentStatus === 'failed') {
              status = 'failed';
            }

            setTimeout(() => {
              router.replace({
                pathname: '/payment/result',
                params: {
                  status: status,
                  orderId: orderIdFromUrl,
                  payment: status,
                  code: responseCode,
                  message: getVNPayMessage(responseCode),
                },
              });
            }, 100);
            
            return false;
          }
          
          // ✅ CHO PHÉP tất cả URL khác load bình thường
          // Điều này bao gồm URL callback có vnp_ResponseCode
          // Backend sẽ nhận được request này và xử lý
          console.log('Allowing URL to load:', url);
          return true;
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView error:', nativeEvent);
          Alert.alert('Lỗi', 'Không thể tải trang thanh toán');
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải trang thanh toán...</Text>
          </View>
        )}
        // Allow navigation
        javaScriptEnabled={true}
        domStorageEnabled={true}
        // Security settings
        mixedContentMode="always"
        originWhitelist={['*']}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
});
