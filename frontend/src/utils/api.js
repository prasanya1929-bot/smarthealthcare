import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth APIs
export const login = (email, password, role) => {
  return api.post('/auth/login', { email, password, role });
};

export const signup = (name, email, password, phone) => {
  return api.post('/auth/signup', { name, email, password, phone });
};

export const signupDoctor = (name, email, password, phone, specialization) => {
  return api.post('/auth/signup-doctor', { name, email, password, phone, specialization });
};

export const signupCaregiver = (name, email, password, phone, patientId) => {
  return api.post('/auth/signup-caregiver', { name, email, password, phone, patientId });
};

// Patient APIs
export const getPatient = (id) => {
  return api.get(`/patients/${id}`);
};

export const updatePatient = (id, data) => {
  return api.put(`/patients/${id}`, data);
};

export const getAllPatients = () => {
  return api.get('/patients');
};

// Doctor APIs
export const getAllDoctors = () => {
  return api.get('/doctors');
};

export const getDoctor = (id) => {
  return api.get(`/doctors/${id}`);
};

export const updateDoctorAvailability = (id, availability) => {
  return api.put(`/doctors/${id}/availability`, { availability });
};

export const getDoctorPatients = (id) => {
  return api.get(`/doctors/${id}/patients`);
};

// Health APIs
export const getPatientHealth = (patientId) => {
  return api.get(`/health/patient/${patientId}`);
};

export const addHealthData = (data) => {
  return api.post('/health', data);
};

export const getHealthPrediction = (patientId) => {
  return api.get(`/health/predict/${patientId}`);
};

// Appointment APIs
export const createAppointment = (data) => {
  return api.post('/appointments', data);
};

export const getPatientAppointments = (patientId) => {
  return api.get(`/appointments/patient/${patientId}`);
};

export const getDoctorAppointments = (doctorId) => {
  return api.get(`/appointments/doctor/${doctorId}`);
};

export const updateAppointment = (id, data) => {
  return api.put(`/appointments/${id}`, data);
};

// Emergency APIs
export const createEmergency = (data) => {
  return api.post('/emergencies', data);
};

export const getActiveEmergencies = () => {
  return api.get('/emergencies/active');
};

export const getPatientEmergencies = (patientId) => {
  return api.get(`/emergencies/patient/${patientId}`);
};

export const updateEmergency = (id, data) => {
  return api.put(`/emergencies/${id}`, data);
};

export const acknowledgeEmergency = (id, userId) => {
  return api.post(`/emergencies/${id}/acknowledge`, { userId });
};

// Sensor Data API
export const sendSensorData = (data) => {
  return api.post('/sensor-data', data);
};

// Reports APIs (file upload uses multipart/form-data)
export const uploadReport = (formData) => {
  return api.post('/reports', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getPatientReports = (patientId, userId, role) => {
  return api.get(`/reports/patient/${patientId}`, {
    params: { userId, role },
  });
};

export default api;

