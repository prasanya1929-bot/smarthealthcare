const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get patient IDs linked to a caregiver
router.get('/:caregiverId/patients', async (req, res) => {
  try {
    const caregiver = await User.findById(req.params.caregiverId);
    
    if (!caregiver || caregiver.role !== 'caregiver') {
      return res.status(404).json({ message: 'Caregiver not found' });
    }

    // Return only patient IDs (not full details)
    const patientIds = caregiver.linkedPatientId ? [caregiver.linkedPatientId] : [];
    
    res.json({ patientIds });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get full patient details (only if caregiver is linked)
router.get('/:caregiverId/patient/:patientId', async (req, res) => {
  try {
    const { caregiverId, patientId } = req.params;
    
    const caregiver = await User.findById(caregiverId);
    if (!caregiver || caregiver.role !== 'caregiver') {
      return res.status(404).json({ message: 'Caregiver not found' });
    }

    // Verify caregiver is linked to this patient
    if (!caregiver.linkedPatientId || caregiver.linkedPatientId.toString() !== patientId) {
      return res.status(403).json({ message: 'Access denied. Patient not linked to this caregiver.' });
    }

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patientData = {
      _id: patient._id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone
    };

    res.json(patientData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

