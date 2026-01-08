/**
 * Smart Emergency Notification Service
 * 
 * This service handles intelligent notification delivery to prevent spam
 * and ensure notifications are sent only when appropriate.
 */

const User = require('../models/User');
const Emergency = require('../models/Emergency');

/**
 * Send emergency notification to caregivers and doctors
 * @param {Object} emergency - Emergency object
 * @param {string} patientId - Patient ID
 * @param {string} emergencyType - 'AI_TRIGGERED' or 'PATIENT_MANUAL'
 * @returns {Promise<Object>} Notification result
 */
async function sendEmergencyNotification(emergency, patientId, emergencyType = 'AI_TRIGGERED') {
  try {
    const patient = await User.findById(patientId);
    if (!patient) {
      console.error('Patient not found for notification');
      return { success: false, error: 'Patient not found' };
    }

    const caregivers = await User.find({ 
      role: 'caregiver', 
      linkedPatientId: patientId 
    });
    const doctors = await User.find({ role: 'doctor' });

    const message = emergencyType === 'PATIENT_MANUAL'
      ? `🚨 PATIENT-TRIGGERED EMERGENCY: ${patient.name} has pressed the emergency button! Immediate attention required.`
      : `🚨 AI-DETECTED EMERGENCY: ${patient.name} has critical health indicators. Immediate medical attention recommended.`;

    // Log notification (in production, integrate with Twilio/SMS/WhatsApp/Push service)
    console.log('========================================');
    console.log('EMERGENCY NOTIFICATION');
    console.log('========================================');
    console.log('Type:', emergencyType);
    console.log('Patient:', patient.name, `(${patient.email})`);
    console.log('Message:', message);
    console.log('Location:', emergency.location || 'Not specified');
    if (emergency.latitude && emergency.longitude) {
      console.log('Coordinates:', emergency.latitude, emergency.longitude);
    }
    console.log('Notifying Caregivers:', caregivers.map(c => `${c.name} (${c.email})`).join(', ') || 'None');
    console.log('Notifying Doctors:', doctors.map(d => `${d.name} (${d.email})`).join(', ') || 'None');
    console.log('========================================');

    // In production, send actual notifications:
    // - Push notifications via service worker
    // - SMS via Twilio
    // - WhatsApp via Twilio API
    // - Email notifications

    return {
      success: true,
      caregiversNotified: caregivers.length,
      doctorsNotified: doctors.length,
      message
    };
  } catch (error) {
    console.error('Error sending emergency notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if notification should be sent for an emergency
 * Implements smart notification control to prevent spam
 * @param {Object} emergency - Emergency object
 * @returns {boolean} Whether notification should be sent
 */
function shouldSendNotification(emergency) {
  // Don't send if already acknowledged
  if (emergency.acknowledged) {
    return false;
  }

  // Don't send if already sent and not enough time has passed for retry
  if (emergency.alertSent && emergency.lastNotificationSent) {
    const timeSinceLastNotification = Date.now() - new Date(emergency.lastNotificationSent).getTime();
    const retryDelay = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Allow retry only if:
    // 1. Not acknowledged
    // 2. Less than 2 retries
    // 3. At least 5 minutes have passed
    if (emergency.notificationRetries < 2 && timeSinceLastNotification >= retryDelay) {
      return true; // Allow retry
    }

    return false; // Don't send duplicate
  }

  // Send if not yet sent
  return !emergency.alertSent;
}

/**
 * Mark emergency as acknowledged by a user
 * @param {string} emergencyId - Emergency ID
 * @param {string} userId - User ID who acknowledged
 * @returns {Promise<Object>} Updated emergency
 */
async function acknowledgeEmergency(emergencyId, userId) {
  try {
    const emergency = await Emergency.findByIdAndUpdate(
      emergencyId,
      {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId
      },
      { new: true }
    ).populate('patientId', 'name email phone');

    if (!emergency) {
      throw new Error('Emergency not found');
    }

    console.log(`Emergency ${emergencyId} acknowledged by user ${userId}`);
    return emergency;
  } catch (error) {
    console.error('Error acknowledging emergency:', error);
    throw error;
  }
}

module.exports = {
  sendEmergencyNotification,
  shouldSendNotification,
  acknowledgeEmergency
};

