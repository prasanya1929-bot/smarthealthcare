// backend/services/aiHealthAnalysis.js

/**
 * AI-Based Predictive Health Analysis Service
 * Analyzes patient vitals and predicts multiple possible future health issues.
 * Handles multiple systems dynamically — respiratory, cardiac, temperature, BP, sugar, cholesterol.
 * Returns: { status, riskLevel, futureIssues[], confidence }
 */

function getAIAnalysis(vitals) {
  const {
    heartRate,
    spo2,
    temperature,
    bpSystolic,
    bpDiastolic,
    bloodSugar,
    cholesterol
  } = vitals;

  let futureIssues = [];
  let abnormalSystems = 0;

  // ---------- Respiratory ----------
  if (spo2 < 95) {
    futureIssues.push("Respiratory distress");
    abnormalSystems++;
  }

  // ---------- Cardiac ----------
  if (heartRate > 120) {
    futureIssues.push("Tachycardia");
    abnormalSystems++;
  } else if (heartRate < 50) {
    futureIssues.push("Bradycardia");
    abnormalSystems++;
  }

  // ---------- Temperature ----------
  if (temperature > 39) {
    futureIssues.push("Fever / Infection");
    abnormalSystems++;
  } else if (temperature < 35) {
    futureIssues.push("Hypothermia");
    abnormalSystems++;
  }

  // ---------- Blood Pressure ----------
  if (bpSystolic > 140 || bpDiastolic > 90) {
    futureIssues.push("Hypertension");
    abnormalSystems++;
  } else if (bpSystolic < 90 || bpDiastolic < 60) {
    futureIssues.push("Hypotension / Shock risk");
    abnormalSystems++;
  }

  // ---------- Blood Sugar ----------
  if (bloodSugar > 200) {
    futureIssues.push("Hyperglycemia / Diabetes Risk");
    abnormalSystems++;
  } else if (bloodSugar < 70) {
    futureIssues.push("Hypoglycemia");
    abnormalSystems++;
  }

  // ---------- Cholesterol ----------
  if (cholesterol > 240) {
    futureIssues.push("High Cholesterol / Cardiovascular Risk");
    abnormalSystems++;
  }

  // ---------- Determine Overall Risk ----------
  let riskLevel =
    abnormalSystems >= 2
      ? "Critical"
      : abnormalSystems === 1
      ? "Warning"
      : "Normal";

  // ---------- Confidence Calculation ----------
  // 20% base + 15% per abnormal system, max 100%
  let confidence = Math.min(100, 20 + abnormalSystems * 15);

  return {
    status: riskLevel === "Critical" ? "CRITICAL" : "OK",
    riskLevel,
    futureIssues,
    confidence
  };
}

// Export the function
module.exports = {
  getAIAnalysis
};
