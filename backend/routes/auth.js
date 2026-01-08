const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email, role });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password (support both bcrypt hashed and plain text for backward compatibility)
    let passwordMatch = false;
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      // Bcrypt hash
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Plain text (for backward compatibility with seeded users)
      passwordMatch = user.password === password;
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user data (no password)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      specialization: user.specialization,
      availability: user.availability,
      linkedPatientId: user.linkedPatientId || null
    };

    res.json({ message: 'Login successful', user: userData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Signup (Patient only - existing)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create patient
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'patient',
      phone: phone || ''
    });

    await user.save();

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    res.status(201).json({ message: 'Signup successful', user: userData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Signup for doctor
router.post('/signup-doctor', async (req, res) => {
  try {
    const { name, email, password, phone, specialization } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'doctor',
      phone: phone || '',
      specialization: specialization || '',
      availability: []
    });

    await user.save();

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      specialization: user.specialization,
      availability: user.availability
    };

    res.status(201).json({ message: 'Doctor signup successful', user: userData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Signup for caregiver (must be linked to a patientId)
router.post('/signup-caregiver', async (req, res) => {
  try {
    const { name, email, password, phone, patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required to sign up as caregiver' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Verify patient exists
    const patient = await User.findOne({ _id: patientId, role: 'patient' });
    if (!patient) {
      return res.status(400).json({ message: 'Invalid patient ID' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'caregiver',
      phone: phone || '',
      linkedPatientId: patientId
    });

    await user.save();

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      linkedPatientId: user.linkedPatientId
    };

    res.status(201).json({ message: 'Caregiver signup successful', user: userData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

