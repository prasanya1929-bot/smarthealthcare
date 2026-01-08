const express = require('express');
const router = express.Router();
const PatientHealth = require('../models/PatientHealth');
const Emergency = require('../models/Emergency');

// Get health data for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const healthData = await PatientHealth.find({ patientId: req.params.patientId })
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json(healthData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add health data
router.post('/', async (req, res) => {
  try {
    const { patientId } = req.body;
    // Ensure numeric values (new metrics included)
    const heartRate = Number(req.body.heartRate);
    const spo2 = Number(req.body.spo2);
    const temperature = Number(req.body.temperature);
    const systolicBP = req.body.systolicBP !== undefined ? Number(req.body.systolicBP) : null;
    const diastolicBP = req.body.diastolicBP !== undefined ? Number(req.body.diastolicBP) : null;
    const sugar = req.body.sugar !== undefined ? Number(req.body.sugar) : null;
    const cholesterol = req.body.cholesterol !== undefined ? Number(req.body.cholesterol) : null;

    // Validate required numeric values
    if ([heartRate, spo2, temperature].some((v) => Number.isNaN(v))) {
      return res.status(400).json({ message: 'Invalid health data values' });
    }

    const status = determineStatus({ heartRate, spo2, temperature, systolicBP, diastolicBP, sugar, cholesterol });

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

    // Auto-create emergency if critical
    if (status === 'critical') {
      const emergency = new Emergency({
        patientId,
        status: 'active',
        location: ''
      });
      await emergency.save();
    }

    res.status(201).json({ message: 'Health data recorded', healthRecord });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Predictive endpoint using actual health values and trends
router.get('/predict/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const history = await PatientHealth.find({ patientId })
      .sort({ timestamp: -1 })
      .limit(30);

    if (!history.length) {
      return res.json({
        riskLevel: 'unknown',
        message: 'Not enough data to predict. Please add more health records.'
      });
    }

    // Analyze actual values, not just status counts
    const recent = history.slice(0, 10); // Last 10 readings
    const avgHeartRate = average(recent.map((h) => h.heartRate));
    const avgSpO2 = average(recent.map((h) => h.spo2));
    const avgTemp = average(recent.map((h) => h.temperature));
    const avgSystolic = average(recent.map((h) => h.systolicBP).filter(isFiniteValue));
    const avgDiastolic = average(recent.map((h) => h.diastolicBP).filter(isFiniteValue));
    const avgSugar = average(recent.map((h) => h.sugar).filter(isFiniteValue));
    const avgChol = average(recent.map((h) => h.cholesterol).filter(isFiniteValue));

    // Count statuses
    const criticalCount = history.filter(h => h.status === 'critical').length;
    const warningCount = history.filter(h => h.status === 'warning').length;
    const normalCount = history.filter(h => h.status === 'normal').length;

    const risk = evaluateRisk({
      avgHeartRate,
      avgSpO2,
      avgTemp,
      avgSystolic,
      avgDiastolic,
      avgSugar,
      avgChol,
      criticalCount,
      warningCount,
      normalCount
    });

    // Potential future diseases
    const possibleFutureDiseases = [];
    if (avgSpO2 !== null && avgSpO2 < 92) possibleFutureDiseases.push('Respiratory distress');
    if ((avgSystolic !== null && avgSystolic >= 140) || (avgDiastolic !== null && avgDiastolic >= 90)) possibleFutureDiseases.push('Hypertension');
    if (avgSugar !== null && avgSugar >= 180) possibleFutureDiseases.push('Diabetes risk / Hyperglycemia');
    if (avgChol !== null && avgChol >= 240) possibleFutureDiseases.push('Hypercholesterolemia');
    if (avgHeartRate !== null && avgHeartRate > 110) possibleFutureDiseases.push('Arrhythmia');

    const confidenceScore = Math.min(1, history.length / 30);

    // Auto emergency trigger for High/Critical
    if (['High', 'Critical'].includes(risk.level)) {
      const activeEmergency = await Emergency.findOne({ patientId, status: 'active' });
      if (!activeEmergency) {
        const emergency = new Emergency({
          patientId,
          status: 'active',
          location: ''
        });
        await emergency.save();

        // Mock notifications (extensible to Twilio)
        try {
          const caregivers = await require('../models/User').find({ role: 'caregiver', linkedPatientId: patientId });
          const doctors = await require('../models/User').find({ role: 'doctor' });
          console.log('Emergency alert (mock SMS):');
          console.log('Patient:', patientId);
          console.log('Notifying caregivers:', caregivers.map(c => c.phone));
          console.log('Notifying doctors:', doctors.map(d => d.phone));
        } catch (notifyErr) {
          console.error('Notification mock error:', notifyErr.message);
        }
      }
    }

    res.json({
      riskLevel: risk.level,
      possibleFutureDiseases,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      explanation: risk.message,
      summary: {
        total: history.length,
        critical: criticalCount,
        warning: warningCount,
        normal: normalCount,
        averages: {
          heartRate: Math.round(avgHeartRate * 10) / 10,
          spo2: Math.round(avgSpO2 * 10) / 10,
          temperature: Math.round(avgTemp * 100) / 100,
          systolicBP: avgSystolic ? Math.round(avgSystolic * 10) / 10 : null,
          diastolicBP: avgDiastolic ? Math.round(avgDiastolic * 10) / 10 : null,
          sugar: avgSugar ? Math.round(avgSugar * 10) / 10 : null,
          cholesterol: avgChol ? Math.round(avgChol * 10) / 10 : null
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helpers
function average(arr) {
  if (!arr || !arr.length) return null;
  const sum = arr.reduce((s, v) => s + v, 0);
  return sum / arr.length;
}

function isFiniteValue(v) {
  return typeof v === 'number' && !Number.isNaN(v);
}

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

function evaluateRisk(metrics) {
  const {
    avgHeartRate,
    avgSpO2,
    avgTemp,
    avgSystolic,
    avgDiastolic,
    avgSugar,
    avgChol,
    criticalCount,
    warningCount,
    normalCount
  } = metrics;

  let level = 'Low';
  let message = 'Vitals are generally stable. Continue regular monitoring.';

  const criticalConditions = [
    avgHeartRate !== null && (avgHeartRate < 50 || avgHeartRate > 110),
    avgSpO2 !== null && avgSpO2 < 90,
    avgTemp !== null && (avgTemp < 35 || avgTemp > 38.4),
    avgSystolic !== null && avgSystolic >= 160,
    avgDiastolic !== null && avgDiastolic >= 100,
    avgSugar !== null && avgSugar >= 200,
    avgChol !== null && avgChol >= 240,
    criticalCount >= 3
  ];

  const warningConditions = [
    avgHeartRate !== null && ((avgHeartRate >= 50 && avgHeartRate < 60) || (avgHeartRate > 100 && avgHeartRate <= 110)),
    avgSpO2 !== null && avgSpO2 >= 90 && avgSpO2 < 95,
    avgTemp !== null && ((avgTemp >= 35 && avgTemp < 36) || (avgTemp > 37.5 && avgTemp <= 38.4)),
    avgSystolic !== null && avgSystolic >= 140 && avgSystolic < 160,
    avgDiastolic !== null && avgDiastolic >= 90 && avgDiastolic < 100,
    avgSugar !== null && avgSugar >= 140 && avgSugar < 200,
    avgChol !== null && avgChol >= 200 && avgChol < 240
  ];

  if (criticalConditions.some(Boolean)) {
    level = 'Critical';
    message = 'CRITICAL: Abnormal vital signs detected. Immediate medical attention recommended.';
  } else if (warningConditions.some(Boolean) || (warningCount >= 5 || (warningCount + criticalCount) > normalCount)) {
    level = 'High';
    message = 'HIGH: Some abnormal trends detected. Monitor closely and consult a doctor if symptoms persist.';
  } else if (warningCount >= 2) {
    level = 'Moderate';
    message = 'MODERATE: Minor fluctuations detected. Continue monitoring.';
  } else {
    level = 'Low';
    message = 'LOW: Vitals are within acceptable ranges.';
  }

  return { level, message };
}

module.exports = router;

