import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPatient,
  updatePatient,
  addHealthData,
  createEmergency,
  getPatientHealth,
  getHealthPrediction,
  uploadReport,
  getPatientReports,
  getAllDoctors,
  createAppointment
} from '../utils/api';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [healthData, setHealthData] = useState({
    heartRate: '',
    spo2: '',
    temperature: ''
  });
  const [recentHealth, setRecentHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportFile, setReportFile] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [appointmentData, setAppointmentData] = useState({
    doctorId: '',
    date: '',
    time: '',
    reason: ''
  });
  const [extraVitals, setExtraVitals] = useState({
    systolicBP: '',
    diastolicBP: '',
    sugar: '',
    cholesterol: ''
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || storedUser.role !== 'patient') {
      navigate('/');
      return;
    }
    setUser(storedUser);
    loadPatientData(storedUser._id);
    loadRecentHealth(storedUser._id);
    loadReports(storedUser._id, storedUser._id, 'patient');
    loadPrediction(storedUser._id);
    loadDoctors();
  }, [navigate]);

  const loadPatientData = async (id) => {
    try {
      const response = await getPatient(id);
      const patient = response.data;
      setFormData({
        name: patient.name || '',
        phone: patient.phone || ''
      });
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  const loadRecentHealth = async (id) => {
    try {
      const response = await getPatientHealth(id);
      if (response.data && response.data.length > 0) {
        setRecentHealth(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  const loadPrediction = async (id) => {
    try {
      const response = await getHealthPrediction(id);
      setPrediction(response.data);
    } catch (error) {
      console.error('Error loading prediction:', error);
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

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updatePatient(user._id, formData);
      alert('Details updated successfully!');
      const response = await getPatient(user._id);
      const updatedUser = { ...user, ...response.data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      alert('Error updating details: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHealth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addHealthData({
        patientId: user._id,
        heartRate: healthData.heartRate,
        spo2: healthData.spo2,
        temperature: healthData.temperature,
        systolicBP: extraVitals.systolicBP || undefined,
        diastolicBP: extraVitals.diastolicBP || undefined,
        sugar: extraVitals.sugar || undefined,
        cholesterol: extraVitals.cholesterol || undefined
      });
      alert('Health data updated successfully!');
      setHealthData({ heartRate: '', spo2: '', temperature: '' });
      setExtraVitals({ systolicBP: '', diastolicBP: '', sugar: '', cholesterol: '' });
      loadRecentHealth(user._id);
      loadPrediction(user._id);
    } catch (error) {
      alert('Error updating health data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEmergency = async () => {
    if (window.confirm('Are you sure you want to trigger an emergency? This will call the ambulance.')) {
      try {
        await createEmergency({
          patientId: user._id,
          location: formData.location || ''
        });
        
        // Call ambulance
        window.location.href = 'tel:108';
        
        alert('Emergency triggered! Ambulance has been called.');
      } catch (error) {
        alert('Error triggering emergency: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleReportUpload = async (e) => {
    e.preventDefault();
    if (!reportFile) {
      alert('Please choose a file to upload');
      return;
    }
    setLoading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', reportFile);
      formDataUpload.append('patientId', user._id);
      formDataUpload.append('uploadedBy', user._id);
      formDataUpload.append('uploadedByRole', 'patient');
      formDataUpload.append('title', reportTitle);

      await uploadReport(formDataUpload);
      alert('Report uploaded successfully!');
      setReportFile(null);
      setReportTitle('');
      loadReports(user._id, user._id, 'patient');
    } catch (error) {
      alert('Error uploading report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentData.doctorId || !appointmentData.date || !appointmentData.time) {
      alert('Please fill all appointment fields');
      return;
    }
    setLoading(true);
    try {
      await createAppointment({
        patientId: user._id,
        doctorId: appointmentData.doctorId,
        date: appointmentData.date,
        time: appointmentData.time,
        reason: appointmentData.reason
      });
      alert('Appointment booked successfully!');
      setAppointmentData({ doctorId: '', date: '', time: '', reason: '' });
    } catch (error) {
      alert('Error booking appointment: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-blue-600">Patient Dashboard</h1>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white text-xl font-semibold px-6 py-3 rounded-lg"
            >
              Logout
            </button>
          </div>
          <p className="text-xl text-gray-600 mt-2">Welcome, {user.name}!</p>
          <p className="text-md text-gray-500 mt-1 break-all">
            <span className="font-semibold">Your Patient ID:</span> {user._id}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Personal Details Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Personal Details</h2>
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div>
                <label className="block text-xl font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xl font-semibold text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold py-4 rounded-lg disabled:opacity-50"
              >
                Update Details
              </button>
            </form>
          </div>

          {/* Health Data Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Update Health Data</h2>
            <form onSubmit={handleUpdateHealth} className="space-y-4">
              <div>
                <label className="block text-xl font-semibold text-gray-700 mb-2">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={healthData.heartRate}
                  onChange={(e) => setHealthData({ ...healthData, heartRate: e.target.value })}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xl font-semibold text-gray-700 mb-2">SpO2 (%)</label>
                <input
                  type="number"
                  value={healthData.spo2}
                  onChange={(e) => setHealthData({ ...healthData, spo2: e.target.value })}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xl font-semibold text-gray-700 mb-2">Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={healthData.temperature}
                  onChange={(e) => setHealthData({ ...healthData, temperature: e.target.value })}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">Systolic BP</label>
                  <input
                    type="number"
                    value={extraVitals.systolicBP}
                    onChange={(e) => setExtraVitals({ ...extraVitals, systolicBP: e.target.value })}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                    placeholder="e.g., 120"
                  />
                </div>
                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">Diastolic BP</label>
                  <input
                    type="number"
                    value={extraVitals.diastolicBP}
                    onChange={(e) => setExtraVitals({ ...extraVitals, diastolicBP: e.target.value })}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                    placeholder="e.g., 80"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    value={extraVitals.sugar}
                    onChange={(e) => setExtraVitals({ ...extraVitals, sugar: e.target.value })}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                    placeholder="e.g., 110"
                  />
                </div>
                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">Cholesterol (mg/dL)</label>
                  <input
                    type="number"
                    value={extraVitals.cholesterol}
                    onChange={(e) => setExtraVitals({ ...extraVitals, cholesterol: e.target.value })}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg"
                    placeholder="e.g., 180"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-semibold py-4 rounded-lg disabled:opacity-50"
              >
                Update Health Data
              </button>
            </form>
          </div>
        </div>

        {/* Recent Health Status & Prediction */}
        {recentHealth && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Recent Health Status</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-lg text-gray-600">Heart Rate</p>
                <p className="text-3xl font-bold text-blue-600">{recentHealth.heartRate} bpm</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-lg text-gray-600">SpO2</p>
                <p className="text-3xl font-bold text-green-600">{recentHealth.spo2}%</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-lg text-gray-600">Temperature</p>
                <p className="text-3xl font-bold text-orange-600">{recentHealth.temperature}°C</p>
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-xl font-semibold px-4 py-2 rounded-lg ${
                recentHealth.status === 'normal' ? 'bg-green-100 text-green-800' :
                recentHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Status: {recentHealth.status.toUpperCase()}
              </span>
            </div>
            {prediction && (
              <div className="mt-6 space-y-2">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Predictive Health Insight</h3>
                <div className="flex items-center gap-3">
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
                  <div>
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
          </div>
        )}

        {/* Reports & Appointments */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
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
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-semibold py-3 rounded-lg disabled:opacity-50"
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
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Book Appointment</h2>
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
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                Book Appointment
              </button>
            </form>
          </div>
        </div>

        {/* Emergency Button */}
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Emergency</h2>
          <button
            onClick={handleEmergency}
            className="bg-red-600 hover:bg-red-700 text-white text-4xl font-bold py-8 px-16 rounded-xl shadow-2xl transform hover:scale-105 transition duration-200"
          >
            🚨 EMERGENCY BUTTON 🚨
          </button>
          <p className="text-xl text-gray-600 mt-4">Click in case of emergency</p>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;

