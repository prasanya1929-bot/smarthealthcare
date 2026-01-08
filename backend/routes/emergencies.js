const express = require('express');
const router = express.Router();
const Emergency = require('../models/Emergency');
const PatientHealth = require('../models/PatientHealth');
const Report = require('../models/Report');
const User = require('../models/User');

// Create emergency
router.post('/', async (req, res) => {
  try {
    const { patientId, location, latitude, longitude } = req.body;

    const emergency = new Emergency({
      patientId,
      status: 'active',
      location: location || '',
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null
    });

    await emergency.save();
    await emergency.populate('patientId', 'name email phone');

    // Notify doctor/caregiver (placeholder for real SMS/notification)
    try {
      const patient = await User.findById(patientId);
      const caregivers = await User.find({ role: 'caregiver', linkedPatientId: patientId });
      const doctors = await User.find({ role: 'doctor' }); // could be filtered by assignment

      console.log('Emergency notification:');
      console.log('Patient:', patient?.name);
      console.log('Location:', location || 'Not specified');
      console.log('Notifying caregivers:', caregivers.map(c => c.email));
      console.log('Notifying doctors:', doctors.map(d => d.email));
    } catch (notifyErr) {
      console.error('Error in notification stub:', notifyErr.message);
    }

    res.status(201).json({ message: 'Emergency created', emergency });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all active emergencies
router.get('/active', async (req, res) => {
  try {
    const emergencies = await Emergency.find({ status: 'active' })
      .populate('patientId', 'name email phone')
      .sort({ timestamp: -1 });
    
    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get full emergency details: history + reports for a given emergency
router.get('/:id/details', async (req, res) => {
  try {
    const emergency = await Emergency.findById(req.params.id)
      .populate('patientId', 'name email phone');

    if (!emergency) {
      return res.status(404).json({ message: 'Emergency not found' });
    }

    const patientId = emergency.patientId._id;

    const [history, reports] = await Promise.all([
      PatientHealth.find({ patientId }).sort({ timestamp: -1 }).limit(50),
      Report.find({ patientId }).sort({ uploadedAt: -1 })
    ]);

    res.json({
      emergency,
      history,
      reports
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get emergencies for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const emergencies = await Emergency.find({ patientId: req.params.patientId })
      .sort({ timestamp: -1 });
    
    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update emergency status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const emergency = await Emergency.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('patientId', 'name email phone');
    
    if (!emergency) {
      return res.status(404).json({ message: 'Emergency not found' });
    }
    
    res.json({ message: 'Emergency updated', emergency });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

