const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Report = require('../models/Report');
const User = require('../models/User');

// Configure storage for reports
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper: check caregiver access to patient
async function canAccessPatient(userId, role, patientId) {
  if (role === 'patient') return userId.toString() === patientId.toString();
  if (role === 'caregiver') {
    const caregiver = await User.findById(userId);
    return caregiver && caregiver.linkedPatientId && caregiver.linkedPatientId.toString() === patientId.toString();
  }
  if (role === 'doctor') {
    // For now, allow doctor to view all reports
    return true;
  }
  return false;
}

// Upload report (patient or caregiver) - supports both /api/reports and /api/reports/upload
const uploadReportHandler = async (req, res) => {
  try {
    const { patientId, uploadedBy, uploadedByRole, title } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!patientId || !uploadedBy || !uploadedByRole) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const hasAccess = await canAccessPatient(uploadedBy, uploadedByRole, patientId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const report = new Report({
      patientId,
      uploadedBy,
      uploadedByRole,
      title: title || req.file.originalname,
      filePath: `/uploads/reports/${req.file.filename}`,
      fileType: req.file.mimetype,
      originalName: req.file.originalname
    });

    await report.save();

    res.status(201).json({ message: 'Report uploaded successfully', report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload report routes (both paths supported)
router.post('/', upload.single('file'), uploadReportHandler);
router.post('/upload', upload.single('file'), uploadReportHandler);

// Get reports for a patient (role-based access)
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { userId, role } = req.query; // passed from frontend

    if (!userId || !role) {
      return res.status(400).json({ message: 'Missing user context' });
    }

    const hasAccess = await canAccessPatient(userId, role, patientId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reports = await Report.find({ patientId })
      .sort({ uploadedAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


