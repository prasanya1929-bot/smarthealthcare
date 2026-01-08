const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smarthealthcare';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});

    // Create sample doctors
    const doctors = [
      {
        name: 'Dr. John Smith',
        email: 'doctor1@health.com',
        password: 'doctor123',
        role: 'doctor',
        phone: '+1234567890',
        specialization: 'Cardiologist',
        availability: ['Monday 9:00-17:00', 'Wednesday 9:00-17:00', 'Friday 9:00-17:00']
      },
      {
        name: 'Dr. Sarah Johnson',
        email: 'doctor2@health.com',
        password: 'doctor123',
        role: 'doctor',
        phone: '+1234567891',
        specialization: 'General Physician',
        availability: ['Tuesday 10:00-18:00', 'Thursday 10:00-18:00']
      }
    ];

    // Create sample caregivers
    const caregivers = [
      {
        name: 'Caregiver Alice',
        email: 'caregiver1@health.com',
        password: 'caregiver123',
        role: 'caregiver',
        phone: '+1234567892'
      },
      {
        name: 'Caregiver Bob',
        email: 'caregiver2@health.com',
        password: 'caregiver123',
        role: 'caregiver',
        phone: '+1234567893'
      }
    ];

    await User.insertMany([...doctors, ...caregivers]);
    console.log('Sample doctors and caregivers created!');
    console.log('\nDoctor Login:');
    console.log('Email: doctor1@health.com, Password: doctor123');
    console.log('Email: doctor2@health.com, Password: doctor123');
    console.log('\nCaregiver Login:');
    console.log('Email: caregiver1@health.com, Password: caregiver123');
    console.log('Email: caregiver2@health.com, Password: caregiver123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

