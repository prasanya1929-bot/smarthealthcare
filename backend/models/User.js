const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'caregiver'],
    required: true
  },
  // For all roles
  phone: {
    type: String,
    default: ''
  },
  // Doctor-only fields
  specialization: {
    type: String,
    default: ''
  },
  availability: {
    type: [String],
    default: []
  },
  // Caregiver-only: which patient this caregiver is linked to
  linkedPatientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

