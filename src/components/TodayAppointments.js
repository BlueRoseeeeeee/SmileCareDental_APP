/**
 * Today Appointments Component
 * @author: HoTram
 * Logic: Hiển thị số lịch khám trong ngày hôm nay, click để xem chi tiết
 */

import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import appointmentService from '../services/appointmentService';

const COLORS = {
  primary: '#2596be',
  text: '#333333',
  textLight: '#666666',
  blue: '#4da6ff',
};

export default function TodayAppointments({ refresh = false }) {
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayAppointments();
  }, []);

  // Reload when parent triggers refresh
  useEffect(() => {
    if (refresh) {
      loadTodayAppointments();
    }
  }, [refresh]);

  const loadTodayAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentService.getMyAppointments();

      if (response.success && response.data) {
        const today = dayjs().format('YYYY-MM-DD');

        // Filter appointments for today
        const todayAppts = response.data.filter((appointment) => {
          const apptDate = dayjs(appointment.appointmentDate).format('YYYY-MM-DD');
          return apptDate === today;
        });

        setTodayCount(todayAppts.length);
      } else {
        setTodayCount(0);
      }
    } catch (error) {
      console.log('Failed to load today appointments:', error);
      setTodayCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (todayCount > 0) {
      // Navigate to today appointments screen
      router.push('/today-appointments');
    } else {
      Alert.alert(
        'Thông báo',
        'Không có lịch khám/điều trị trong ngày hôm nay.'
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <View style={styles.illustrationContainer}>
          <Ionicons name="calendar" size={48} color={COLORS.blue} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Lịch hôm nay:</Text>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.blue} style={{ marginTop: 4 }} />
          ) : (
            <Text style={styles.subtitle}>
              {todayCount > 0
                ? `Có ${todayCount} lịch khám`
                : 'Không có lịch khám/điều trị'}
            </Text>
          )}
        </View>
      </View>
      {!loading && (
        <View style={styles.rightSection}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textLight} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  illustrationContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e6f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  rightSection: {
    padding: 4,
  },
});
