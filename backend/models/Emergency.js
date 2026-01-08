const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'cancelled'],
    default: 'active'
  },
  location: {
    type: String,
    default: ''
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  // Emergency type: 'AI_TRIGGERED' (from AI analysis) or 'PATIENT_MANUAL' (from button press)
  emergencyType: {
    type: String,
    enum: ['AI_TRIGGERED', 'PATIENT_MANUAL'],
    default: 'AI_TRIGGERED'
  },
  // Smart notification control fields
  alertSent: {
    type: Boolean,
    default: false
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Retry tracking for notifications
  notificationRetries: {
    type: Number,
    default: 0
  },
  lastNotificationSent: {
    type: Date,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Emergency', emergencySchema);

