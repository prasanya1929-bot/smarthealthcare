import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDoctorPatients,
  getActiveEmergencies,
  updateDoctorAvailability,
  getPatientHealth,
  updateEmergency,
  getDoctorAppointments,
  getPatientReports,
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

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [healthData, setHealthData] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [newSlot, setNewSlot] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [selectedEmergencyDetails, setSelectedEmergencyDetails] = useState(null);
  const [patientPrediction, setPatientPrediction] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || storedUser.role !== 'doctor') {
      navigate('/');
      return;
    }
    setUser(storedUser);
    setAvailability(storedUser.availability || []);
    loadData(storedUser._id);
    const interval = setInterval(() => loadData(storedUser._id), 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [navigate]);

  const loadData = async (doctorId) => {
    try {
      const [patientsRes, emergenciesRes, appointmentsRes] = await Promise.all([
        getDoctorPatients(doctorId),
        getActiveEmergencies(),
        getDoctorAppointments(doctorId)
      ]);
      setPatients(patientsRes.data);
      setEmergencies(emergenciesRes.data);
      setAppointments(appointmentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadPatientHealth = async (patientId) => {
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
      setPatientPrediction(response.data);
    } catch (error) {
      console.error('Error loading prediction:', error);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    loadPatientHealth(patient.patient._id);
  };

  const handleAddSlot = async () => {
    if (newSlot.trim()) {
      const updated = [...availability, newSlot.trim()];
      try {
        await updateDoctorAvailability(user._id, updated);
        setAvailability(updated);
        setNewSlot('');
        alert('Availability updated!');
      } catch (error) {
        alert('Error updating availability');
      }
    }
  };

  const handleResolveEmergency = async (emergencyId) => {
    try {
      await updateEmergency(emergencyId, { status: 'resolved' });
      loadData(user._id);
      alert('Emergency resolved!');
    } catch (error) {
      alert('Error resolving emergency');
    }
  };

  const handleViewEmergencyDetails = async (emergency) => {
    try {
      // Load recent health + reports for that patient
      const [healthRes, reportsRes] = await Promise.all([
        getPatientHealth(emergency.patientId._id),
        getPatientReports(emergency.patientId._id, user._id, 'doctor')
      ]);
      setSelectedEmergencyDetails({
        emergency,
        history: healthRes.data.slice(0, 10),
        reports: reportsRes.data
      });
    } catch (error) {
      console.error('Error loading emergency details:', error);
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
              <h1 className="text-4xl font-bold text-green-600">Doctor Dashboard</h1>
              <p className="text-xl text-gray-600 mt-2">Welcome, Dr. {user.name}!</p>
              <p className="text-lg text-gray-500">Specialization: {user.specialization}</p>
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
          {/* Assigned Patients */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Assigned Patients</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {patients.length === 0 ? (
                <p className="text-lg text-gray-500">No patients assigned yet</p>
              ) : (
                patients.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectPatient(item)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedPatient?.patient?._id === item.patient._id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <p className="text-xl font-semibold">{item.patient.name}</p>
                    <p className="text-gray-600">{item.patient.email}</p>
                    <p className="text-gray-600">Phone: {item.patient.phone}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Emergencies */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-red-600 mb-4">Active Emergencies</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {emergencies.length === 0 ? (
                <p className="text-lg text-gray-500">No active emergencies</p>
              ) : (
                emergencies.map((emergency) => (
                  <div key={emergency._id} className="p-4 border-2 border-red-300 bg-red-50 rounded-lg">
                    <p className="text-xl font-semibold text-red-800">
                      {emergency.patientId?.name || 'Unknown Patient'}
                    </p>
                    <p className="text-gray-600">{emergency.patientId?.phone || 'N/A'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(emergency.timestamp).toLocaleString()}
                    </p>
                    {emergency.location && (
                      <p className="text-sm text-gray-600 mt-1">
                        Location: {emergency.location}
                      </p>
                    )}
                    {(emergency.latitude && emergency.longitude) && (
                      <p className="text-sm text-gray-600 mt-1">
                        Coordinates: {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                      </p>
                    )}
                    <button
                      onClick={() => handleResolveEmergency(emergency._id)}
                      className="mt-2 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold px-4 py-2 rounded-lg"
                    >
                      Resolve Emergency
                    </button>
                    <button
                      onClick={() => handleViewEmergencyDetails(emergency)}
                      className="mt-2 ml-2 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-4 py-2 rounded-lg"
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Upcoming Appointments</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {appointments.length === 0 ? (
              <p className="text-lg text-gray-500">No appointments scheduled</p>
            ) : (
              appointments.map((apt) => (
                <div key={apt._id} className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-xl font-semibold">
                    Patient: {apt.patientId?.name || 'Unknown'} ({apt.patientId?._id || 'N/A'})
                  </p>
                  <p className="text-lg text-gray-700">
                    Date: {apt.date} &nbsp; Time: {apt.time}
                  </p>
                  {apt.reason && (
                    <p className="text-base text-gray-600 mt-1">
                      Reason: {apt.reason}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">Status: {apt.status}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Availability Slots */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Set Availability</h2>
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value)}
              placeholder="e.g., Monday 9:00-17:00"
              className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg"
            />
            <button
              onClick={handleAddSlot}
              className="bg-green-600 hover:bg-green-700 text-white text-xl font-semibold px-6 py-3 rounded-lg"
            >
              Add Slot
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availability.map((slot, idx) => (
              <span key={idx} className="bg-green-100 text-green-800 text-lg font-semibold px-4 py-2 rounded-lg">
                {slot}
              </span>
            ))}
          </div>
        </div>

        {/* Patient Health Charts */}
        {selectedPatient && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Health Charts - {selectedPatient.patient.name}
            </h2>
            {healthData.length > 0 && getChartData() ? (
              <div className="h-96">
                <Line data={getChartData()} options={chartOptions} />
              </div>
            ) : (
              <p className="text-lg text-gray-500">No health data available</p>
            )}

            {patientPrediction && (
              <div className="mt-6 space-y-2">
                <h3 className="text-2xl font-bold text-gray-800">Predictive Insight</h3>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">Risk Level:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-lg font-bold ${
                      patientPrediction.riskLevel?.toLowerCase() === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : patientPrediction.riskLevel?.toLowerCase() === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : patientPrediction.riskLevel?.toLowerCase() === 'moderate'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {patientPrediction.riskLevel || 'Unknown'}
                  </span>
                </div>
                {patientPrediction.possibleFutureDiseases?.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-800">Possible Future Issues:</p>
                    <ul className="list-disc list-inside text-gray-700">
                      {patientPrediction.possibleFutureDiseases.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-lg text-gray-700">
                  <span className="font-semibold">Confidence:</span> {(patientPrediction.confidenceScore * 100 || 0).toFixed(0)}%
                </p>
                <p className="text-lg text-gray-700">
                  {patientPrediction.explanation || patientPrediction.message}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selected Emergency Details */}
        {selectedEmergencyDetails && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Emergency Details - {selectedEmergencyDetails.emergency.patientId?.name}
            </h2>
            <p className="text-lg text-gray-700 mb-2">
              Location:{' '}
              {selectedEmergencyDetails.emergency.location || 'Not specified'}
            </p>
            <p className="text-lg text-gray-700 mb-4">
              Time: {new Date(selectedEmergencyDetails.emergency.timestamp).toLocaleString()}
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Recent History</h3>
                {selectedEmergencyDetails.history.length === 0 ? (
                  <p className="text-lg text-gray-500">No recent health data.</p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedEmergencyDetails.history.map((h) => (
                      <li key={h._id} className="p-3 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-500 mb-1">
                          {new Date(h.timestamp).toLocaleString()}
                        </p>
                        <p className="text-lg">
                          HR: {h.heartRate} bpm, SpO2: {h.spo2}%, Temp: {h.temperature}°C
                        </p>
                        <p className="text-sm">
                          Status:{' '}
                          <span
                            className={
                              h.status === 'critical'
                                ? 'text-red-600 font-semibold'
                                : h.status === 'warning'
                                  ? 'text-yellow-600 font-semibold'
                                  : 'text-green-600 font-semibold'
                            }
                          >
                            {h.status.toUpperCase()}
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Reports</h3>
                {selectedEmergencyDetails.reports.length === 0 ? (
                  <p className="text-lg text-gray-500">No reports uploaded.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {selectedEmergencyDetails.reports.map((r) => (
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;

