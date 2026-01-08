import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPatient,
  getPatientHealth,
  getActiveEmergencies,
  uploadReport,
  getPatientReports,
  createAppointment,
  getDoctorAppointments,
  getAllDoctors,
  getHealthPrediction
} from '../utils/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CaregiverDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [healthData, setHealthData] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportFile, setReportFile] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  const [appointmentData, setAppointmentData] = useState({
    doctorId: '',
    date: '',
    time: '',
    reason: ''
  });
  const [doctors, setDoctors] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [previousEmergencyCount, setPreviousEmergencyCount] = useState(0);

  // Register service worker and request notification permission on component mount
  useEffect(() => {
    // Register service worker for background notifications (works even when app is closed)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Request notification permission
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Notification permission granted for emergency alerts');
          } else {
            console.log('Notification permission denied');
          }
        });
      } else if (Notification.permission === 'granted') {
        console.log('Notification permission already granted');
      }
    } else {
      console.warn('This browser does not support notifications');
    }
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || storedUser.role !== 'caregiver') {
      navigate('/');
      return;
    }
    setUser(storedUser);
    if (storedUser.linkedPatientId) {
      loadLinkedPatient(storedUser.linkedPatientId);
      loadEmergencies(storedUser.linkedPatientId);
      loadPatientHealthData(storedUser.linkedPatientId);
      loadReports(storedUser.linkedPatientId, storedUser._id, 'caregiver');
      loadDoctors();
    }
    const interval = setInterval(() => {
      if (storedUser.linkedPatientId) {
        loadEmergencies(storedUser.linkedPatientId);
        loadPatientHealthData(storedUser.linkedPatientId);
      }
    }, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [navigate]);

  const loadLinkedPatient = async (patientId) => {
    try {
      const response = await getPatient(patientId);
      setPatients([response.data]);
      setSelectedPatient(response.data);
      loadPrediction(patientId);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadEmergencies = async (patientId) => {
    try {
      const emergenciesRes = await getActiveEmergencies();
      const filtered = emergenciesRes.data.filter(
        (e) => e.patientId && e.patientId._id === patientId
      );
      
      // Check for new emergencies and trigger notifications
      if (filtered.length > previousEmergencyCount && Notification.permission === 'granted') {
        const newEmergencies = filtered.slice(0, filtered.length - previousEmergencyCount);
        newEmergencies.forEach(emergency => {
          const patientName = emergency.patientId?.name || 'Unknown Patient';
          
          // Try to use service worker for background notifications first
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'EMERGENCY_ALERT',
              patientName: patientName,
              emergencyId: emergency._id,
              timestamp: emergency.timestamp
            });
          }
          
          // Fallback to regular notification if service worker is not available
          try {
            const notification = new Notification('🚨 Emergency Alert', {
              body: `${patientName} has triggered an emergency! Please check the dashboard immediately.`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `emergency-${emergency._id}`,
              requireInteraction: true,
              vibrate: [200, 100, 200, 100, 200],
              timestamp: new Date(emergency.timestamp).getTime(),
              data: {
                emergencyId: emergency._id,
                patientId: patientId
              }
            });
            
            // Handle notification click to focus window
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (error) {
            console.error('Error showing notification:', error);
          }
        });
      }
      
      setPreviousEmergencyCount(filtered.length);
      setEmergencies(filtered);
    } catch (error) {
      console.error('Error loading emergencies:', error);
    }
  };

  const loadPatientHealthData = async (patientId) => {
    try {
      const response = await getPatientHealth(patientId);
      const data = response.data.slice(0, 20).reverse(); // Last 20 readings
      setHealthData(data);
      loadPrediction(patientId);
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  const loadPrediction = async (patientId) => {
    try {
      const response = await getHealthPrediction(patientId);
      setPrediction(response.data);
    } catch (error) {
      console.error('Error loading prediction:', error);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    loadPatientHealthData(patient._id);
  };

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Notification permission granted for emergency alerts');
          } else {
            console.log('Notification permission denied');
          }
        });
      } else if (Notification.permission === 'granted') {
        console.log('Notification permission already granted');
      }
    } else {
      console.warn('This browser does not support notifications');
    }
  }, []);

  const loadReports = async (patientId, userId, role) => {
    try {
      const response = await getPatientReports(patientId, userId, role);
      setReports(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await getAllDoctors();
      setDoctors(response.data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const handleReportUpload = async (e) => {
    e.preventDefault();
    if (!reportFile || !selectedPatient) {
      alert('Please choose a file and ensure a patient is selected');
      return;
    }
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', reportFile);
      formDataUpload.append('patientId', selectedPatient._id);
      formDataUpload.append('uploadedBy', user._id);
      formDataUpload.append('uploadedByRole', 'caregiver');
      formDataUpload.append('title', reportTitle);

      await uploadReport(formDataUpload);
      alert('Report uploaded successfully!');
      setReportFile(null);
      setReportTitle('');
      loadReports(selectedPatient._id, user._id, 'caregiver');
    } catch (error) {
      alert('Error uploading report: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !appointmentData.doctorId || !appointmentData.date || !appointmentData.time) {
      alert('Please fill all appointment fields');
      return;
    }
    try {
      await createAppointment({
        patientId: selectedPatient._id,
        doctorId: appointmentData.doctorId,
        date: appointmentData.date,
        time: appointmentData.time,
        reason: appointmentData.reason
      });
      alert('Appointment booked successfully!');
      setAppointmentData({ doctorId: '', date: '', time: '', reason: '' });
    } catch (error) {
      alert('Error booking appointment: ' + (error.response?.data?.message || error.message));
    }
  };

  const getChartData = () => {
    if (!healthData.length) return null;

    const labels = healthData.map((_, i) => `Reading ${i + 1}`);
    
    return {
      labels,
      datasets: [
        {
          label: 'Heart Rate (bpm)',
          data: healthData.map(h => h.heartRate),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'SpO2 (%)',
          data: healthData.map(h => h.spo2),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        },
        {
          label: 'Temperature (°C)',
          data: healthData.map(h => h.temperature),
          borderColor: 'rgb(249, 115, 22)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 16 }
        }
      },
      title: {
        display: true,
        text: 'Patient Health Data',
        font: { size: 20 }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Heart Rate / SpO2',
          font: { size: 14 }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Temperature (°C)',
          font: { size: 14 }
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-purple-600">Caregiver Dashboard</h1>
              <p className="text-xl text-gray-600 mt-2">Welcome, {user.name}!</p>
              {user.linkedPatientId && (
                <p className="text-md text-gray-500 mt-1 break-all">
                  <span className="font-semibold">Linked Patient ID:</span> {user.linkedPatientId}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white text-xl font-semibold px-6 py-3 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Patient List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Linked Patient</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {patients.length === 0 ? (
                <p className="text-lg text-gray-500">No linked patient found</p>
              ) : (
                patients.map((patient) => (
                  <div
                    key={patient._id}
                    onClick={() => handleSelectPatient(patient)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedPatient?._id === patient._id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <p className="text-xl font-semibold">{patient.name}</p>
                    <p className="text-gray-600">{patient.email}</p>
                    {patient.phone && (
                      <p className="text-gray-500 text-sm mt-1">Phone: {patient.phone}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Emergency Alerts - Messages Only */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-red-600 mb-4">Emergency Alerts</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {emergencies.length === 0 ? (
                <p className="text-lg text-gray-500">No active emergencies</p>
              ) : (
                emergencies.map((emergency) => (
                  <div key={emergency._id} className="p-4 border-2 border-red-300 bg-red-50 rounded-lg animate-pulse">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">🚨</span>
                      <div className="flex-1">
                        <p className="text-xl font-semibold text-red-800 mb-1">
                          Emergency Alert
                        </p>
                        <p className="text-lg font-medium text-gray-800 mb-2">
                          Patient: {emergency.patientId?.name || 'Unknown Patient'}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-semibold">Time:</span> {new Date(emergency.timestamp).toLocaleString()}
                        </p>
                        {emergency.location && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-semibold">Location:</span> {emergency.location}
                          </p>
                        )}
                        {(emergency.latitude && emergency.longitude) && (
                          <p className="text-sm text-gray-600 mb-1">
                            <span className="font-semibold">Coordinates:</span> {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                          </p>
                        )}
                        <div className="mt-3 p-2 bg-white rounded border border-red-200">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">Message:</span> Patient {emergency.patientId?.name || 'Unknown'} has triggered an emergency. Please check their status immediately.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Patient Health Charts and Reports/Appointments */}
        {selectedPatient && (
          <>
            {prediction && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Predictive Health Insight - {selectedPatient.name}
                </h2>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold">Risk Level:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-lg font-bold ${
                      prediction.riskLevel?.toLowerCase() === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : prediction.riskLevel?.toLowerCase() === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : prediction.riskLevel?.toLowerCase() === 'moderate'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {prediction.riskLevel || 'Unknown'}
                  </span>
                </div>
                {prediction.possibleFutureDiseases?.length > 0 && (
                  <div className="mb-2">
                    <p className="font-semibold text-gray-800">Possible Future Issues:</p>
                    <ul className="list-disc list-inside text-gray-700">
                      {prediction.possibleFutureDiseases.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-lg text-gray-700">
                  <span className="font-semibold">Confidence:</span> {(prediction.confidenceScore * 100 || 0).toFixed(0)}%
                </p>
                <p className="text-lg text-gray-700">
                  {prediction.explanation || prediction.message}
                </p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Health Charts - {selectedPatient.name}
              </h2>
              {healthData.length > 0 && getChartData() ? (
                <div className="h-96">
                  <Line data={getChartData()} options={chartOptions} />
                </div>
              ) : (
                <p className="text-lg text-gray-500">No health data available</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload Reports */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Medical Reports</h2>
                <form onSubmit={handleReportUpload} className="space-y-4 mb-4">
                  <div>
                    <label className="block text-xl font-semibold text-gray-700 mb-2">
                      Report Title (optional)
                    </label>
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                      placeholder="e.g., Blood Test, ECG Report"
                    />
                  </div>
                  <div>
                    <label className="block text-xl font-semibold text-gray-700 mb-2">
                      Upload File (PDF / Image)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setReportFile(e.target.files[0] || null)}
                      className="w-full text-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-semibold py-3 rounded-lg"
                  >
                    Upload Report
                  </button>
                </form>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {reports.length === 0 ? (
                    <p className="text-lg text-gray-500">No reports uploaded yet.</p>
                  ) : (
                    reports.map((r) => {
                      const fileUrl = r.filePath.startsWith('http') 
                        ? r.filePath 
                        : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${r.filePath}`;
                      return (
                        <div
                          key={r._id}
                          onClick={() => window.open(fileUrl, '_blank')}
                          className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-left"
                        >
                          <p className="text-lg font-semibold">{r.title || r.originalName}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(r.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Appointment Booking */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Book Appointment for {selectedPatient.name}
                </h2>
                <form onSubmit={handleCreateAppointment} className="space-y-4">
                  <div>
                    <label className="block text-xl font-semibold text-gray-700 mb-2">
                      Select Doctor
                    </label>
                    <select
                      value={appointmentData.doctorId}
                      onChange={(e) =>
                        setAppointmentData({ ...appointmentData, doctorId: e.target.value })
                      }
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Choose doctor</option>
                      {doctors.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.specialization})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xl font-semibold text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={appointmentData.date}
                      onChange={(e) =>
                        setAppointmentData({ ...appointmentData, date: e.target.value })
                      }
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xl font-semibold text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={appointmentData.time}
                      onChange={(e) =>
                        setAppointmentData({ ...appointmentData, time: e.target.value })
                      }
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xl font-semibold text-gray-700 mb-2">
                      Reason (optional)
                    </label>
                    <input
                      type="text"
                      value={appointmentData.reason}
                      onChange={(e) =>
                        setAppointmentData({ ...appointmentData, reason: e.target.value })
                      }
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                      placeholder="e.g., Regular checkup, Follow-up"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-semibold py-3 rounded-lg"
                  >
                    Book Appointment
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CaregiverDashboard;

