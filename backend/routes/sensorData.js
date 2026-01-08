const express = require('express');
const router = express.Router();
const PatientHealth = require('../models/PatientHealth');
const Emergency = require('../models/Emergency');

// POST /api/sensor-data
router.post('/', async (req, res) => {
  try {
    const { patientId } = req.body;
    // Ensure numeric values
    const heartRate = Number(req.body.heartRate);
    const spo2 = Number(req.body.spo2);
    const temperature = Number(req.body.temperature);
    const systolicBP = req.body.systolicBP !== undefined ? Number(req.body.systolicBP) : null;
    const diastolicBP = req.body.diastolicBP !== undefined ? Number(req.body.diastolicBP) : null;
    const sugar = req.body.sugar !== undefined ? Number(req.body.sugar) : null;
    const cholesterol = req.body.cholesterol !== undefined ? Number(req.body.cholesterol) : null;

    if (!patientId || heartRate === undefined || spo2 === undefined || temperature === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate numeric values
    if (isNaN(heartRate) || isNaN(spo2) || isNaN(temperature)) {
      return res.status(400).json({ message: 'Invalid sensor data values' });
    }

    // Determine status using shared thresholds
    const status = determineStatus({ heartRate, spo2, temperature, systolicBP, diastolicBP, sugar, cholesterol });

    // Save health data
    const healthRecord = new PatientHealth({
      patientId,
      heartRate,
      spo2,
      temperature,
      systolicBP,
      diastolicBP,
      sugar,
      cholesterol,
      status
    });

    await healthRecord.save();

    // Auto-create emergency if abnormal values
    if (status === 'critical' || status === 'warning') {
      // Check if there's already an active emergency
      const existingEmergency = await Emergency.findOne({
        patientId,
        status: 'active'
      });

      if (!existingEmergency && status === 'critical') {
        const emergency = new Emergency({
          patientId,
          status: 'active',
          location: ''
        });
        await emergency.save();
      }
    }

    res.status(201).json({
      message: 'Sensor data recorded',
      healthRecord,
      emergencyTriggered: status === 'critical'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

// Shared logic with health route
function determineStatus({ heartRate, spo2, temperature, systolicBP, diastolicBP, sugar, cholesterol }) {
  let status = 'normal';

  const isNormalHR = heartRate >= 60 && heartRate <= 100;
  const isNormalSpO2 = spo2 >= 95 && spo2 <= 100;
  const isNormalTemp = temperature >= 36 && temperature <= 37.5;
  const isNormalBP = systolicBP === null || diastolicBP === null ? true : (systolicBP < 140 && diastolicBP < 90);
  const isNormalSugar = sugar === null ? true : sugar < 140;
  const isNormalChol = cholesterol === null ? true : cholesterol < 200;
  const isNormal = isNormalHR && isNormalSpO2 && isNormalTemp && isNormalBP && isNormalSugar && isNormalChol;

  const isWarningHR = (heartRate >= 50 && heartRate < 60) || (heartRate > 100 && heartRate <= 110);
  const isWarningSpO2 = spo2 >= 90 && spo2 < 95;
  const isWarningTemp = (temperature >= 35 && temperature < 36) || (temperature > 37.5 && temperature <= 38.4);
  const isWarningBP = systolicBP !== null && diastolicBP !== null && ((systolicBP >= 140 && systolicBP <= 159) || (diastolicBP >= 90 && diastolicBP <= 99));
  const isWarningSugar = sugar !== null && sugar >= 140 && sugar <= 199;
  const isWarningChol = cholesterol !== null && cholesterol >= 200 && cholesterol <= 239;
  const isWarning = isWarningHR || isWarningSpO2 || isWarningTemp || isWarningBP || isWarningSugar || isWarningChol;

  const isCriticalHR = heartRate < 50 || heartRate > 110;
  const isCriticalSpO2 = spo2 < 90;
  const isCriticalTemp = temperature < 35 || temperature > 38.4;
  const isCriticalBP = systolicBP !== null && diastolicBP !== null && (systolicBP >= 160 || diastolicBP >= 100);
  const isCriticalSugar = sugar !== null && sugar >= 200;
  const isCriticalChol = cholesterol !== null && cholesterol >= 240;
  const isCritical = isCriticalHR || isCriticalSpO2 || isCriticalTemp || isCriticalBP || isCriticalSugar || isCriticalChol;

  if (isCritical) return 'critical';
  if (isWarning) return 'warning';
  if (isNormal) return 'normal';
  return 'warning';
}

