/**
 * @author: HoTram
 * Price Schedule Utils - Hàm tiện ích xử lý price schedules
 */
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(isBetween);
dayjs.extend(timezone);
dayjs.extend(utc);

/**
 * Lấy thông tin price schedule cho một item (service hoặc addon) tại ngày cụ thể
 * @param {Object} item - Service hoặc ServiceAddOn object
 * @param {Object} appointmentDate - dayjs object hoặc Date
 * @returns {Object} { basePrice, activeSchedule }
 */
export const getPriceScheduleInfo = (item, appointmentDate) => {
  if (!item || !appointmentDate) {
    return { basePrice: item?.price || 0, activeSchedule: null };
  }

  const priceSchedules = item.priceSchedules || [];
  if (priceSchedules.length === 0) {
    return { basePrice: item.price || 0, activeSchedule: null };
  }

  const appointmentDay = dayjs(appointmentDate).tz('Asia/Ho_Chi_Minh').startOf('day');

  const activeSchedule = priceSchedules.find(schedule => {
    if (!schedule.isActive) return false;

    const startDate = dayjs(schedule.startDate).tz('Asia/Ho_Chi_Minh').startOf('day');
    const endDate = dayjs(schedule.endDate).tz('Asia/Ho_Chi_Minh').endOf('day');

    return appointmentDay.isBetween(startDate, endDate, null, '[]');
  });

  return {
    basePrice: item.price || 0,
    activeSchedule: activeSchedule || null
  };
};

/**
 * Tính giá hiệu dụng dựa trên ngày appointment và price schedules
 * @param {Object} item - Service hoặc ServiceAddOn object
 * @param {Object} appointmentDate - dayjs object hoặc Date
 * @returns {number} Effective price
 */
export const getEffectivePriceForDate = (item, appointmentDate) => {
  if (!item || !appointmentDate) {
    return item?.price || 0;
  }

  const priceSchedules = item.priceSchedules || [];
  if (priceSchedules.length === 0) {
    return item.price || 0;
  }

  const appointmentDay = dayjs(appointmentDate).tz('Asia/Ho_Chi_Minh').startOf('day');

  const activeSchedule = priceSchedules.find(schedule => {
    if (!schedule.isActive) return false;

    const startDate = dayjs(schedule.startDate).tz('Asia/Ho_Chi_Minh').startOf('day');
    const endDate = dayjs(schedule.endDate).tz('Asia/Ho_Chi_Minh').endOf('day');

    return appointmentDay.isBetween(startDate, endDate, null, '[]');
  });

  return activeSchedule ? activeSchedule.price : (item.price || 0);
};

/**
 * Format currency VND
 * @param {number} amount - Số tiền
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0';
  return amount.toLocaleString('vi-VN');
};
