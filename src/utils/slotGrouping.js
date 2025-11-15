/**
 * @author: HoTram (dựa trên logic của TrungNghia & ThuTram)
 * Slot Grouping Utilities - Gộp các slot liên tục dựa trên thời gian dịch vụ
 */

/**
 * Gộp các slot liên tục có sẵn dựa trên thời gian dịch vụ
 * @param {Array} slots - Mảng các slot với startTime, endTime, status
 * @param {Number} serviceDurationMinutes - Thời gian dịch vụ (phút), ví dụ: 45
 * @param {Number} slotDurationMinutes - Thời gian mỗi slot (phút), ví dụ: 15
 * @returns {Array} Mảng các nhóm slot, mỗi nhóm chứa các slot liên tục
 * 
 * Ví dụ:
 * - Thời gian dịch vụ: 45 phút
 * - Thời gian slot: 15 phút
 * - Số slot cần: 45/15 = 3 slot
 * - Input: [slot1, slot2, slot3, slot4, slot5]
 * - Output: [[slot1, slot2, slot3], [slot2, slot3, slot4], [slot3, slot4, slot5]]
 */
export const groupConsecutiveSlots = (slots, serviceDurationMinutes, slotDurationMinutes = 15) => {
  // Tính số slot liên tục cần thiết
  const requiredSlotCount = Math.ceil(serviceDurationMinutes / slotDurationMinutes);
  
  console.log('🔢 Thông số gộp slot:', {
    totalSlots: slots.length,
    serviceDuration: serviceDurationMinutes,
    slotDuration: slotDurationMinutes,
    requiredSlotCount
  });
  
  // Nếu dịch vụ chỉ cần 1 slot hoặc ít hơn, trả về từng slot riêng lẻ
  if (requiredSlotCount <= 1) {
    return slots
      .map(slot => ({
        groupId: slot._id,
        slots: [slot],
        slotIds: [slot._id],
        startTime: slot.startTimeVN || slot.startTime,
        endTime: slot.endTimeVN || slot.endTime,
        displayTime: formatSlotTime(slot.startTimeVN || slot.startTime, slot.endTimeVN || slot.endTime),
        isAvailable: slot.status === 'available',
        unavailableReason: slot.status === 'locked' ? 'Slot đang được giữ chỗ' : 
                          slot.status === 'booked' ? 'Slot đã được đặt' : null
      }));
  }
  
  // Sắp xếp TẤT CẢ các slot (chưa lọc theo status)
  const sortedSlots = slots
    .sort((a, b) => {
      const timeA = parseTimeToMinutes(a.startTimeVN || a.startTime);
      const timeB = parseTimeToMinutes(b.startTimeVN || b.startTime);
      return timeA - timeB;
    });
  
  console.log('📊 Tổng số slot xử lý:', sortedSlots.length);
  console.log('📊 Phân loại trạng thái slot:', {
    available: sortedSlots.filter(s => s.status === 'available').length,
    locked: sortedSlots.filter(s => s.status === 'locked').length,
    booked: sortedSlots.filter(s => s.status === 'booked').length
  });
  
  // Tìm tất cả các nhóm slot liên tục có thể (kể cả không khả dụng)
  const slotGroups = [];
  
  for (let i = 0; i <= sortedSlots.length - requiredSlotCount; i++) {
    const potentialGroup = [];
    let isConsecutive = true;
    let hasUnavailableSlot = false;
    let unavailableReasons = [];
    let statusPriority = 0; // 0: available, 1: locked, 2: booked
    
    // Kiểm tra xem có thể tạo nhóm liên tục từ vị trí i không
    for (let j = 0; j < requiredSlotCount; j++) {
      const currentSlot = sortedSlots[i + j];
      
      if (!currentSlot) {
        isConsecutive = false;
        break;
      }
      
      // Theo dõi các slot không khả dụng với độ ưu tiên
      // Ưu tiên: booked (2) > locked (1) > available (0)
      if (currentSlot.status !== 'available') {
        hasUnavailableSlot = true;
        
        if (currentSlot.status === 'booked') {
          statusPriority = Math.max(statusPriority, 2);
          unavailableReasons.push('booked');
        } else if (currentSlot.status === 'locked') {
          statusPriority = Math.max(statusPriority, 1);
          unavailableReasons.push('locked');
        }
      }
      
      // Kiểm tra slot hiện tại có liên tục với slot trước không
      if (j > 0) {
        const prevSlot = potentialGroup[j - 1];
        if (!areSlotsConsecutive(prevSlot, currentSlot)) {
          isConsecutive = false;
          break;
        }
      }
      
      potentialGroup.push(currentSlot);
    }
    
    // Nếu tìm thấy nhóm liên tục hợp lệ, thêm vào (kể cả không khả dụng)
    if (isConsecutive && potentialGroup.length === requiredSlotCount) {
      const firstSlot = potentialGroup[0];
      const lastSlot = potentialGroup[potentialGroup.length - 1];
      
      // Lấy startTime từ slot ĐẦU, endTime từ slot CUỐI
      const startTimeToUse = firstSlot.startTimeVN || firstSlot.startTime;
      const endTimeToUse = lastSlot.endTimeVN || lastSlot.endTime;
      
      console.log('🎯 Tạo nhóm slot:', {
        firstSlotId: firstSlot._id,
        lastSlotId: lastSlot._id,
        startTimeToUse,
        endTimeToUse,
        displayTime: formatSlotTime(startTimeToUse, endTimeToUse)
      });
      
      // Xác định lý do hiển thị dựa trên trạng thái ưu tiên cao nhất
      let displayReason = null;
      if (statusPriority === 2) {
        displayReason = 'Có slot đã được đặt';
      } else if (statusPriority === 1) {
        displayReason = 'Có slot đang được giữ chỗ';
      }
      
      slotGroups.push({
        groupId: `group_${firstSlot._id}`,
        slots: potentialGroup,
        slotIds: potentialGroup.map(s => s._id),
        startTime: startTimeToUse,
        endTime: endTimeToUse,
        displayTime: formatSlotTime(startTimeToUse, endTimeToUse),
        roomId: firstSlot.roomId,
        roomName: firstSlot.roomName,
        shiftName: firstSlot.shiftName,
        isAvailable: !hasUnavailableSlot,
        unavailableReason: displayReason,
        statusPriority: statusPriority,
        slotStatuses: potentialGroup.map(s => s.status)
      });
    }
  }
  
  console.log('📦 Tổng số nhóm slot tạo:', slotGroups.length);
  console.log('✅ Nhóm khả dụng:', slotGroups.filter(g => g.isAvailable).length);
  console.log('❌ Nhóm không khả dụng:', slotGroups.filter(g => !g.isAvailable).length);
  
  return slotGroups;
};

/**
 * Kiểm tra hai slot có liên tục không (endTime của slot1 === startTime của slot2)
 */
const areSlotsConsecutive = (slot1, slot2) => {
  // VALIDATE 1: Phải cùng phòng
  const room1Id = slot1.room?.id || slot1.room?._id || null;
  const room2Id = slot2.room?.id || slot2.room?._id || null;
  
  if (room1Id && room2Id) {
    if (room1Id.toString() !== room2Id.toString()) {
      console.log(`❌ Slot không cùng phòng: ${room1Id} vs ${room2Id}`);
      return false;
    }
  }
  
  // VALIDATE 2: Phải cùng phòng con (nếu có)
  const subRoom1Id = slot1.room?.subRoom?.id || slot1.room?.subRoom?._id || null;
  const subRoom2Id = slot2.room?.subRoom?.id || slot2.room?.subRoom?._id || null;
  
  if (subRoom1Id !== subRoom2Id) {
    if (subRoom1Id && subRoom2Id) {
      if (subRoom1Id.toString() !== subRoom2Id.toString()) {
        console.log(`❌ Slot không cùng phòng con: ${subRoom1Id} vs ${subRoom2Id}`);
        return false;
      }
    } else {
      console.log(`❌ Không khớp phòng con: một có phòng con, một không`);
      return false;
    }
  }
  
  // VALIDATE 3: Thời gian phải liên tục
  const endTime1 = parseTimeToMinutes(slot1.endTimeVN || slot1.endTime);
  const startTime2 = parseTimeToMinutes(slot2.startTimeVN || slot2.startTime);
  
  // Cho phép chênh lệch 0-1 phút để xử lý lỗi làm tròn
  const isTimeConsecutive = Math.abs(endTime1 - startTime2) <= 1;
  
  if (!isTimeConsecutive) {
    console.log(`❌ Slot không liên tục về thời gian: khoảng cách = ${Math.abs(endTime1 - startTime2)} phút`);
  }
  
  return isTimeConsecutive;
};

/**
 * Chuyển chuỗi thời gian (HH:mm) hoặc Date object thành số phút từ nửa đêm
 */
const parseTimeToMinutes = (time) => {
  if (!time) return 0;
  
  let timeStr;
  if (typeof time === 'string') {
    // Kiểm tra đã ở định dạng HH:mm chưa
    if (time.includes(':') && time.length <= 5) {
      timeStr = time;
    } else {
      // Thử parse như chuỗi Date (ISO format)
      const date = new Date(time);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  } else if (time instanceof Date) {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } else {
    console.warn('Định dạng thời gian không xác định:', time);
    return 0;
  }
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Format khoảng thời gian slot để hiển thị
 */
const formatSlotTime = (startTime, endTime) => {
  console.log('🕐 formatSlotTime gọi với:', { 
    startTime, 
    startTimeType: typeof startTime,
    endTime, 
    endTimeType: typeof endTime 
  });
  
  let start, end;
  
  // Ưu tiên định dạng VN time (chuỗi HH:mm)
  if (typeof startTime === 'string' && startTime.includes(':') && startTime.length <= 5) {
    start = startTime;
  } else {
    const date = new Date(startTime);
    start = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  
  if (typeof endTime === 'string' && endTime.includes(':') && endTime.length <= 5) {
    end = endTime;
  } else {
    const date = new Date(endTime);
    end = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  
  console.log('🕐 formatSlotTime kết quả:', { start, end, display: `${start} - ${end}` });
  
  return `${start} - ${end}`;
};

/**
 * Gộp slot theo ca để hiển thị
 */
export const groupSlotsByShift = (slotGroups) => {
  return {
    morning: slotGroups.filter(g => g.shiftName === 'Ca Sáng'),
    afternoon: slotGroups.filter(g => g.shiftName === 'Ca Chiều'),
    evening: slotGroups.filter(g => g.shiftName === 'Ca Tối')
  };
};

/**
 * Tính tổng tiền cọc
 */
export const calculateDepositAmount = (slotCount, depositPerSlot = 50000) => {
  return slotCount * depositPerSlot;
};

/**
 * Format tiền tệ (VNĐ)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
};
