import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl w-full text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-indigo-600 mb-4">
          SMART HEALTH CARE
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8">
          Emergency Health Monitoring & Doctor Appointment System
        </p>
        
        <div className="space-y-4 mt-12">
          <button
            onClick={() => navigate('/login/patient')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-2xl font-semibold py-6 px-8 rounded-xl transition duration-200 shadow-lg hover:shadow-xl"
          >
            Patient Login
          </button>
          
          <button
            onClick={() => navigate('/login/doctor')}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-2xl font-semibold py-6 px-8 rounded-xl transition duration-200 shadow-lg hover:shadow-xl"
          >
            Doctor Login
          </button>
          
          <button
            onClick={() => navigate('/login/caregiver')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-2xl font-semibold py-6 px-8 rounded-xl transition duration-200 shadow-lg hover:shadow-xl"
          >
            Caregiver Login
          </button>
        </div>

        <div className="mt-8">
          <p className="text-lg text-gray-600 mb-2">New here?</p>
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="text-blue-600 hover:text-blue-800 text-xl font-semibold underline"
            >
              Patient Sign Up
            </button>
            <button
              onClick={() => navigate('/signup/doctor')}
              className="text-green-600 hover:text-green-800 text-xl font-semibold underline"
            >
              Doctor Sign Up
            </button>
            <button
              onClick={() => navigate('/signup/caregiver')}
              className="text-purple-600 hover:text-purple-800 text-xl font-semibold underline"
            >
              Caregiver Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

