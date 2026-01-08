const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const patient = await User.findById(req.params.id);
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

// Update patient details
router.put('/:id', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const patient = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone },
      { new: true }
    );
    
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const patientData = {
      _id: patient._id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone
    };
    
    res.json({ message: 'Patient updated', patient: patientData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all patients
router.get('/', async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' });
    const patientsData = patients.map(p => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      phone: p.phone
    }));
    res.json(patientsData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

