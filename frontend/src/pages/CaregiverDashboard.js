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

  const handleCall = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

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
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCall(patient.phone);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-4 py-2 rounded-lg"
                      >
                        📞 Call Patient
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Emergency Alerts */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-red-600 mb-4">Emergency Alerts</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {emergencies.length === 0 ? (
                <p className="text-lg text-gray-500">No active emergencies</p>
              ) : (
                emergencies.map((emergency) => (
                  <div key={emergency._id} className="p-4 border-2 border-red-300 bg-red-50 rounded-lg">
                    <p className="text-xl font-semibold text-red-800">
                      🚨 {emergency.patientId?.name || 'Unknown Patient'}
                    </p>
                    <p className="text-gray-600">
                      {emergency.patientId?.phone || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(emergency.timestamp).toLocaleString()}
                    </p>
                    {emergency.location && (
                      <p className="text-sm text-gray-600 mt-1">
                        Location: {emergency.location}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleCall(emergency.patientId?.phone)}
                        className="bg-red-600 hover:bg-red-700 text-white text-lg font-semibold px-4 py-2 rounded-lg"
                      >
                        📞 Call Patient
                      </button>
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
                    reports.map((r) => (
                      <a
                        key={r._id}
                        href={r.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <p className="text-lg font-semibold">{r.title || r.originalName}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(r.uploadedAt).toLocaleString()}
                        </p>
                      </a>
                    ))
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

