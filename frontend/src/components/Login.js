import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { login } from '../utils/api';

const Login = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password, role);
      const user = response.data.user;
      
      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(user));
      
      // Navigate to appropriate dashboard
      if (user.role === 'patient') {
        navigate('/patient/dashboard');
      } else if (user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (user.role === 'caregiver') {
        navigate('/caregiver/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const getRoleStyles = () => {
    if (role === 'patient') {
      return {
        titleColor: 'text-blue-600',
        buttonBg: 'bg-blue-600 hover:bg-blue-700'
      };
    }
    if (role === 'doctor') {
      return {
        titleColor: 'text-green-600',
        buttonBg: 'bg-green-600 hover:bg-green-700'
      };
    }
    return {
      titleColor: 'text-purple-600',
      buttonBg: 'bg-purple-600 hover:bg-purple-700'
    };
  };

  const styles = getRoleStyles();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
        <h2 className={`text-4xl font-bold ${styles.titleColor} mb-2 text-center capitalize`}>
          {role} Login
        </h2>
        <p className="text-gray-600 text-center mb-8 text-lg">
          Enter your credentials to continue
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-xl font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-xl font-semibold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${styles.buttonBg} text-white text-2xl font-semibold py-5 px-8 rounded-xl transition duration-200 shadow-lg hover:shadow-xl disabled:opacity-50`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="mt-6 text-indigo-600 hover:text-indigo-800 text-lg font-semibold w-full text-center"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default Login;

