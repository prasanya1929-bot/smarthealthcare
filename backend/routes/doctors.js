const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// Get all doctors
router.get('/', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' });
    const doctorsData = doctors.map(d => ({
      _id: d._id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      specialization: d.specialization,
      availability: d.availability
    }));
    res.json(doctorsData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const doctorData = {
      _id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      specialization: doctor.specialization,
      availability: doctor.availability
    };
    
    res.json(doctorData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update doctor availability
router.put('/:id/availability', async (req, res) => {
  try {
    const { availability } = req.body;
    const doctor = await User.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true }
    );
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({ message: 'Availability updated', availability: doctor.availability });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get doctor's assigned patients
router.get('/:id/patients', async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.params.id })
      .populate('patientId', 'name email phone');
    
    const patients = appointments.map(apt => ({
      appointmentId: apt._id,
      patient: apt.patientId,
      date: apt.date,
      time: apt.time,
      status: apt.status
    }));
    
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

