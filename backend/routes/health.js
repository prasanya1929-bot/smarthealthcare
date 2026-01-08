const express = require('express');
const router = express.Router();
const PatientHealth = require('../models/PatientHealth');
const Emergency = require('../models/Emergency');
const { getAIAnalysis } = require('../services/aiHealthAnalysis');
const { sendEmergencyNotification, shouldSendNotification } = require('../services/notificationService');

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

    // Get AI analysis for dynamic disease prediction
    const aiAnalysis = getAIAnalysis(
      {
        heartRate: avgHeartRate,
        spo2: avgSpO2,
        temperature: avgTemp,
        systolicBP: avgSystolic,
        diastolicBP: avgDiastolic,
        sugar: avgSugar,
        cholesterol: avgChol
      },
      { criticalCount, warningCount }
    );

    // Auto-emergency trigger for Critical AI status (smart notification control)
    if (aiAnalysis.status === 'CRITICAL' || risk.level === 'Critical') {
      let activeEmergency = await Emergency.findOne({ 
        patientId, 
        status: 'active',
        emergencyType: 'AI_TRIGGERED'
      });

      if (!activeEmergency) {
        // Create new emergency
        activeEmergency = new Emergency({
          patientId,
          status: 'active',
          location: '',
          emergencyType: 'AI_TRIGGERED',
          alertSent: false,
          acknowledged: false
        });
        await activeEmergency.save();
      }

      // Smart notification: Only send if conditions are met
      if (shouldSendNotification(activeEmergency)) {
        const notificationResult = await sendEmergencyNotification(
          activeEmergency,
          patientId,
          'AI_TRIGGERED'
        );

        if (notificationResult.success) {
          // Update emergency with notification status
          activeEmergency.alertSent = true;
          activeEmergency.lastNotificationSent = new Date();
          activeEmergency.notificationRetries = (activeEmergency.notificationRetries || 0) + 1;
          await activeEmergency.save();
        }
      }
    }

    // Combine AI analysis with existing prediction
    res.json({
      // AI Analysis (primary)
      status: aiAnalysis.status,
      riskLevel: aiAnalysis.riskLevel,
      futureIssues: aiAnalysis.futureIssues.length > 0 ? aiAnalysis.futureIssues : possibleFutureDiseases,
      confidence: aiAnalysis.confidence,
      // Legacy fields for backward compatibility
      possibleFutureDiseases: aiAnalysis.futureIssues.length > 0 ? aiAnalysis.futureIssues : possibleFutureDiseases,
      confidenceScore: aiAnalysis.confidence / 100, // Convert 0-100 to 0-1 for compatibility
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
  // Filter out null, undefined, and NaN values
  const validValues = arr.filter(v => v !== null && v !== undefined && !isNaN(v) && typeof v === 'number');
  if (!validValues.length) return null;
  const sum = validValues.reduce((s, v) => s + Number(v), 0);
  return sum / validValues.length;
}

function isFiniteValue(v) {
  return v !== null && v !== undefined && typeof v === 'number' && !Number.isNaN(v) && isFinite(v);
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

  // Count actual critical conditions (only check if value exists and is truly critical)
  let criticalConditionCount = 0;
  if (avgHeartRate !== null && !isNaN(avgHeartRate) && (avgHeartRate < 50 || avgHeartRate > 110)) criticalConditionCount++;
  if (avgSpO2 !== null && !isNaN(avgSpO2) && avgSpO2 < 90) criticalConditionCount++;
  if (avgTemp !== null && !isNaN(avgTemp) && (avgTemp < 35 || avgTemp > 38.4)) criticalConditionCount++;
  if (avgSystolic !== null && !isNaN(avgSystolic) && avgSystolic >= 160) criticalConditionCount++;
  if (avgDiastolic !== null && !isNaN(avgDiastolic) && avgDiastolic >= 100) criticalConditionCount++;
  if (avgSugar !== null && !isNaN(avgSugar) && avgSugar >= 200) criticalConditionCount++;
  if (avgChol !== null && !isNaN(avgChol) && avgChol >= 240) criticalConditionCount++;

  // Count warning conditions
  let warningConditionCount = 0;
  if (avgHeartRate !== null && !isNaN(avgHeartRate) && ((avgHeartRate >= 50 && avgHeartRate < 60) || (avgHeartRate > 100 && avgHeartRate <= 110))) warningConditionCount++;
  if (avgSpO2 !== null && !isNaN(avgSpO2) && avgSpO2 >= 90 && avgSpO2 < 95) warningConditionCount++;
  if (avgTemp !== null && !isNaN(avgTemp) && ((avgTemp >= 35 && avgTemp < 36) || (avgTemp > 37.5 && avgTemp <= 38.4))) warningConditionCount++;
  if (avgSystolic !== null && !isNaN(avgSystolic) && avgSystolic >= 140 && avgSystolic < 160) warningConditionCount++;
  if (avgDiastolic !== null && !isNaN(avgDiastolic) && avgDiastolic >= 90 && avgDiastolic < 100) warningConditionCount++;
  if (avgSugar !== null && !isNaN(avgSugar) && avgSugar >= 140 && avgSugar < 200) warningConditionCount++;
  if (avgChol !== null && !isNaN(avgChol) && avgChol >= 200 && avgChol < 240) warningConditionCount++;

  // Determine risk level based on actual conditions and history
  // Critical: Multiple critical conditions OR 3+ critical readings in history
  if (criticalConditionCount >= 2 || criticalCount >= 3) {
    level = 'Critical';
    message = 'CRITICAL: Multiple abnormal vital signs detected. Immediate medical attention recommended.';
  } 
  // High: One critical condition OR multiple warnings OR significant warning history
  else if (criticalConditionCount >= 1 || warningConditionCount >= 3 || warningCount >= 5 || (warningCount + criticalCount) > normalCount) {
    level = 'High';
    message = 'HIGH: Some abnormal trends detected. Monitor closely and consult a doctor if symptoms persist.';
  } 
  // Moderate: Some warning conditions or moderate warning history
  else if (warningConditionCount >= 1 || warningCount >= 2) {
    level = 'Moderate';
    message = 'MODERATE: Minor fluctuations detected. Continue monitoring.';
  } 
  // Low: All vitals normal
  else {
    level = 'Low';
    message = 'LOW: Vitals are within acceptable ranges. Continue regular monitoring.';
  }

  return { level, message };
}

module.exports = router;

