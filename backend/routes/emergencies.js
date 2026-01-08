const express = require('express');
const router = express.Router();
const Emergency = require('../models/Emergency');
const PatientHealth = require('../models/PatientHealth');
const Report = require('../models/Report');
const User = require('../models/User');
const { sendEmergencyNotification, shouldSendNotification, acknowledgeEmergency } = require('../services/notificationService');

// Create emergency (supports both AI-triggered and patient manual triggers)
router.post('/', async (req, res) => {
  try {
    const { patientId, location, latitude, longitude, emergencyType } = req.body;

    // Determine emergency type: 'PATIENT_MANUAL' if explicitly set, otherwise 'AI_TRIGGERED'
    const type = emergencyType === 'PATIENT_MANUAL' ? 'PATIENT_MANUAL' : 'AI_TRIGGERED';

    // Check if there's already an active emergency of the same type
    const existingEmergency = await Emergency.findOne({ 
      patientId, 
      status: 'active',
      emergencyType: type
    });

    let emergency;
    if (existingEmergency) {
      // Update existing emergency with new location if provided
      if (location || latitude || longitude) {
        existingEmergency.location = location || existingEmergency.location;
        existingEmergency.latitude = latitude ? Number(latitude) : existingEmergency.latitude;
        existingEmergency.longitude = longitude ? Number(longitude) : existingEmergency.longitude;
        await existingEmergency.save();
      }
      emergency = existingEmergency;
    } else {
      // Create new emergency
      emergency = new Emergency({
        patientId,
        status: 'active',
        location: location || '',
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        emergencyType: type,
        alertSent: false,
        acknowledged: false
      });
      await emergency.save();
    }

    await emergency.populate('patientId', 'name email phone');

    // INSTANT NOTIFICATION for patient manual triggers (bypasses AI checks)
    // For AI-triggered, notification is handled in health.js with smart control
    if (type === 'PATIENT_MANUAL') {
      // Always send immediate notification for manual triggers
      const notificationResult = await sendEmergencyNotification(
        emergency,
        patientId,
        'PATIENT_MANUAL'
      );

      if (notificationResult.success) {
        emergency.alertSent = true;
        emergency.lastNotificationSent = new Date();
        emergency.notificationRetries = 1;
        await emergency.save();
      }
    }

    res.status(201).json({ 
      message: 'Emergency created', 
      emergency,
      notificationSent: type === 'PATIENT_MANUAL'
    });
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

// Acknowledge emergency (mark as viewed by caregiver/doctor)
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const emergency = await acknowledgeEmergency(req.params.id, userId);
    
    res.json({ 
      message: 'Emergency acknowledged', 
      emergency 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

