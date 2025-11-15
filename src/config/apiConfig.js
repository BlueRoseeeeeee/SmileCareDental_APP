/**
 * Config API cho APP
 * Kết nối đến SmileDental backend
 */


const PRODUCTION_BASE = 'https://be.smilecare.io.vn/api';
const PRODUCTION_BACKEND = 'https://be.smilecare.io.vn';
const LOCAL_BASE = 'http://localhost';
const LOCAL_PORTS = {
  auth: 3001,
  user: 3001,
  room: 3002,
  service: 3003,
  schedule: 3005,
  appointment: 3006,
  payment: 3007,
  invoice: 3008,
  medicine: 3009,
  record: 3010,
  statistic: 3011,
  chatbot: 3013,
};

// true--> kết nối production
// false--> kết nối localhost
const USE_PRODUCTION = true;

/**
 * Get API URL for a service
 */
export function getServiceUrl(serviceName) {
  if (USE_PRODUCTION) {
    return PRODUCTION_BASE;
  }
  
  const port = LOCAL_PORTS[serviceName] || 3001;
  return `${LOCAL_BASE}:${port}/api`;
}

export function getBackendUrl(serviceName) {
  if (USE_PRODUCTION) {
    return PRODUCTION_BACKEND;
  }
  
  const port = LOCAL_PORTS[serviceName] || 3001;
  return `${LOCAL_BASE}:${port}`;
}

export function getAllServiceUrls() {
    //kiểm tra môi trường--> nếu true thì trả về url production còn false thì trả về url localhost
  if (USE_PRODUCTION) {
    return {
      auth: PRODUCTION_BASE,
      user: PRODUCTION_BASE,
      room: PRODUCTION_BASE,
      service: PRODUCTION_BASE,
      schedule: PRODUCTION_BASE,
      appointment: PRODUCTION_BASE,
      payment: PRODUCTION_BASE,
      invoice: PRODUCTION_BASE,
      medicine: PRODUCTION_BASE,
      record: PRODUCTION_BACKEND,
      statistic: PRODUCTION_BASE,
      chatbot: PRODUCTION_BASE,
      backend: PRODUCTION_BACKEND,
    };
  }
  
  return {
    auth: `${LOCAL_BASE}:${LOCAL_PORTS.auth}/api`,
    user: `${LOCAL_BASE}:${LOCAL_PORTS.user}/api`,
    room: `${LOCAL_BASE}:${LOCAL_PORTS.room}/api`,
    service: `${LOCAL_BASE}:${LOCAL_PORTS.service}/api`,
    schedule: `${LOCAL_BASE}:${LOCAL_PORTS.schedule}/api`,
    appointment: `${LOCAL_BASE}:${LOCAL_PORTS.appointment}/api`,
    payment: `${LOCAL_BASE}:${LOCAL_PORTS.payment}/api`,
    invoice: `${LOCAL_BASE}:${LOCAL_PORTS.invoice}/api`,
    medicine: `${LOCAL_BASE}:${LOCAL_PORTS.medicine}/api`,
    record: `${LOCAL_BASE}:${LOCAL_PORTS.record}`,
    statistic: `${LOCAL_BASE}:${LOCAL_PORTS.statistic}/api`,
    chatbot: `${LOCAL_BASE}:${LOCAL_PORTS.chatbot}/api`,
    backend: `${LOCAL_BASE}:${LOCAL_PORTS.appointment}`,
  };
}

export const API_URLS = getAllServiceUrls();

// API Base URL for auth service
export const AUTH_API_URL = getServiceUrl('auth');
export const BACKEND_URL = getBackendUrl('auth');

// Export URLs for services
export const SERVICE_URL = API_URLS.service;
export const SCHEDULE_URL = API_URLS.schedule;
export const RECORD_URL = API_URLS.record;
export const APPOINTMENT_URL = API_URLS.appointment;
