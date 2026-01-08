const mongoose = require('mongoose');

const patientHealthSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  heartRate: {
    type: Number,
    required: true
  },
  spo2: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
  },
  systolicBP: {
    type: Number,
    default: null
  },
  diastolicBP: {
    type: Number,
    default: null
  },
  sugar: {
    type: Number,
    default: null
  },
  cholesterol: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['normal', 'warning', 'critical'],
    default: 'normal'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PatientHealth', patientHealthSchema);

